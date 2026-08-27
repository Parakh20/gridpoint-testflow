-- Stop one company's second Razorpay subscription from clobbering the row of
-- a live first one.
--
-- Found during the 2026-08-27 live cutover probe. Company razorpay-review
-- briefly had two Razorpay subscriptions (an unused one created via the API
-- and the real one created through the app). Both were cancelled; the
-- cancellation event for the UNUSED subscription arrived last and overwrote
-- subscriptions.provider_subscription_id, so the row ended up describing the
-- wrong subscription entirely.
--
-- Cause: `subscriptions` is keyed on company_id alone, so every event for
-- ANY of that company's provider subscriptions lands on the same row and
-- overwrites provider_subscription_id. The ordering guard added in
-- 20260814000002 does not help — it compares event timestamps per COMPANY,
-- and the clobbering event was genuinely newer, just about a different
-- subscription.
--
-- Fix: ignore an event whose provider subscription id differs from the one on
-- file while that stored subscription is still in a live status. A company
-- that legitimately re-subscribes has its old subscription in a terminal
-- status (cancelled/completed/expired) or no provider id at all (trial), so
-- the new subscription is adopted normally. The guard fails safe: when two
-- subscriptions really are live at once it preserves the row already on file
-- rather than letting delivery order decide, and warns so the situation is
-- visible in the logs.
--
-- Not reachable from the app today — manage-subscription's `subscribe` action
-- refuses when provider_subscription_id is already set — but the webhook
-- endpoint is driven by Razorpay, not by us, so this belongs in the DB.
--
-- Everything else is copied verbatim from 20260823000004; migrations are
-- forward-only, so the whole function is restated rather than patched.

CREATE OR REPLACE FUNCTION upsert_subscription(
  _company_id UUID,
  _provider_sub_id TEXT,
  _provider_cust_id TEXT,
  _provider_plan_id TEXT,
  _status TEXT,
  _period_start TIMESTAMPTZ,
  _period_end TIMESTAMPTZ,
  _seat_count INT,
  _raw JSONB,
  _event_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_id UUID;
  resolved_plan_id UUID;
  resolved_interval TEXT;
  prior_period_end TIMESTAMPTZ;
  prior_pending_plan_id UUID;
  prior_last_event_at TIMESTAMPTZ;
  prior_sub_id UUID;
  prior_provider_sub_id TEXT;
  prior_status TEXT;
  -- Statuses in which the stored subscription is still the company's real
  -- one. Anything outside this set is finished, so a different provider
  -- subscription id is a legitimate re-subscribe rather than a collision.
  live_statuses CONSTANT TEXT[] := ARRAY['created', 'authenticated', 'active', 'pending', 'halted', 'past_due'];
BEGIN
  -- Read the row's state BEFORE upserting, so we can detect "a new period
  -- actually started" (new _period_start is after what we had on file) and
  -- "this event is older than one we already processed" (ordering guard).
  SELECT id, current_period_end, pending_plan_id, last_event_at, provider_subscription_id, status
    INTO prior_sub_id, prior_period_end, prior_pending_plan_id, prior_last_event_at,
         prior_provider_sub_id, prior_status
    FROM subscriptions WHERE company_id = _company_id;

  -- Identity guard: an event about a DIFFERENT provider subscription must not
  -- overwrite a live one. See the migration header for why delivery order
  -- alone cannot be trusted to resolve this.
  IF prior_sub_id IS NOT NULL
     AND prior_provider_sub_id IS NOT NULL
     AND _provider_sub_id IS NOT NULL
     AND prior_provider_sub_id <> _provider_sub_id
     AND prior_status = ANY (live_statuses) THEN
    RAISE WARNING 'upsert_subscription: ignoring event for % — company % is on live subscription % (status %)',
      _provider_sub_id, _company_id, prior_provider_sub_id, prior_status;
    RETURN prior_sub_id;
  END IF;

  -- Ordering guard: if we've already applied a newer (or equal) event for
  -- this company, this delayed/out-of-order event is a stale duplicate of
  -- information we've already superseded — no-op rather than overwrite
  -- newer state with older state. Only guards when BOTH timestamps are
  -- known; a caller that doesn't pass _event_created_at (or a first-ever
  -- event with no prior row) always proceeds, preserving old behavior.
  IF prior_sub_id IS NOT NULL
     AND _event_created_at IS NOT NULL
     AND prior_last_event_at IS NOT NULL
     AND _event_created_at < prior_last_event_at THEN
    RETURN prior_sub_id;
  END IF;

  SELECT plan_id, 'monthly' INTO resolved_plan_id, resolved_interval
  FROM plan_provider_mapping WHERE razorpay_plan_id_monthly = _provider_plan_id;

  IF resolved_plan_id IS NULL THEN
    SELECT plan_id, 'annual' INTO resolved_plan_id, resolved_interval
    FROM plan_provider_mapping WHERE razorpay_plan_id_annual = _provider_plan_id;
  END IF;

  IF resolved_plan_id IS NULL THEN
    RAISE WARNING 'upsert_subscription: no plan_provider_mapping found for razorpay plan id %', _provider_plan_id;
  END IF;

  INSERT INTO subscriptions (
    company_id, provider, provider_subscription_id, provider_customer_id,
    provider_plan_id, plan_id, billing_interval, status,
    current_period_start, current_period_end, seat_count, raw_provider_payload,
    last_event_at
  )
  VALUES (
    _company_id, 'razorpay', _provider_sub_id, _provider_cust_id,
    _provider_plan_id, resolved_plan_id, resolved_interval, _status,
    _period_start, _period_end, _seat_count, _raw,
    COALESCE(_event_created_at, NOW())
  )
  ON CONFLICT (company_id) DO UPDATE
  SET provider_subscription_id = EXCLUDED.provider_subscription_id,
      -- COALESCE, not a plain overwrite: Razorpay's subscription.* webhook
      -- payloads carry customer_id = null (confirmed live on 2026-08-23 from
      -- the stored subscription.activated payload for sub_TT8Tw2ktlofRVj —
      -- the field exists in the entity but is null, even though the REST API's
      -- GET /subscriptions/:id does return it). Overwriting unconditionally
      -- meant provider_customer_id could never stay set, which silently broke
      -- invoice history (getInvoices filters by customer id) for every paying
      -- tenant. Never downgrade a known customer id back to NULL.
      provider_customer_id     = COALESCE(EXCLUDED.provider_customer_id, subscriptions.provider_customer_id),
      provider_plan_id         = EXCLUDED.provider_plan_id,
      plan_id                  = EXCLUDED.plan_id,
      billing_interval         = EXCLUDED.billing_interval,
      status                   = EXCLUDED.status,
      current_period_start     = EXCLUDED.current_period_start,
      current_period_end       = EXCLUDED.current_period_end,
      seat_count               = EXCLUDED.seat_count,
      raw_provider_payload     = EXCLUDED.raw_provider_payload,
      last_event_at            = COALESCE(EXCLUDED.last_event_at, subscriptions.last_event_at),
      updated_at               = NOW()
  RETURNING id INTO sub_id;

  -- Apply a scheduled downgrade only once the provider confirms a new
  -- period actually started (prior_period_end existed and the new start
  -- is at/after it). Unchanged from 20260813000012.
  IF prior_pending_plan_id IS NOT NULL
     AND prior_period_end IS NOT NULL
     AND _period_start >= prior_period_end THEN
    UPDATE subscriptions
      SET plan_id = prior_pending_plan_id,
          pending_plan_id = NULL,
          pending_plan_requested_at = NULL
      WHERE company_id = _company_id;
  END IF;

  RETURN sub_id;
END;
$$;

-- Signature is unchanged, so the REVOKE/GRANT from 20260822000013 still
-- applies to this replacement — but restate it rather than rely on that, per
-- gotcha 20 in CLAUDE.md.
REVOKE ALL ON FUNCTION upsert_subscription(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_subscription(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT, JSONB, TIMESTAMPTZ) TO service_role;
