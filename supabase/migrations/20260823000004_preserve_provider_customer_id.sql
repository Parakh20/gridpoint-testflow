-- Fixes invoice history being permanently empty for every paying tenant.
--
-- Symptom: subscriptions.provider_customer_id was NULL on an active, paid
-- Razorpay subscription (company test1, sub_TT8Tw2ktlofRVj), so
-- manage-subscription's `invoices` action — which filters Razorpay's invoice
-- list by customer id — always short-circuited to an empty list.
--
-- Cause: Razorpay's subscription.* webhook entity carries customer_id = null.
-- upsert_subscription assigned EXCLUDED.provider_customer_id unconditionally,
-- so every webhook wrote NULL over whatever was there.
--
-- Fix: COALESCE on that one column only. Everything else in the function is
-- copied verbatim from 20260814000002 (migrations are forward-only, so the
-- whole function is restated rather than patched in place). The plan id,
-- status, period and seat columns keep their unconditional overwrite — those
-- legitimately change and the ordering guard above already rejects stale
-- events.
--
-- The complementary half of the fix lives in manage-subscription's `invoices`
-- action, which lazily backfills the customer id from the provider when the
-- column is still NULL (this migration stops it being erased; it can't
-- retroactively recover an id no webhook ever delivered).

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
BEGIN
  -- Read the row's state BEFORE upserting, so we can detect "a new period
  -- actually started" (new _period_start is after what we had on file) and
  -- "this event is older than one we already processed" (ordering guard).
  SELECT id, current_period_end, pending_plan_id, last_event_at
    INTO prior_sub_id, prior_period_end, prior_pending_plan_id, prior_last_event_at
    FROM subscriptions WHERE company_id = _company_id;

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
