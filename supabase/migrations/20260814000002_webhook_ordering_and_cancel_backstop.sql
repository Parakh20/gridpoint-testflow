-- Closes two launch-readiness gaps flagged in docs/dev/BILLING_QA_MATRIX.md
-- (scenarios 6 and 8): no protection against an out-of-order/delayed webhook
-- overwriting newer subscription state, and no DB-side backstop that flips
-- a subscription to 'cancelled' once cancel_at passes if the corresponding
-- Razorpay webhook is missed, delayed, or (today) never sent at all.

-- =============================================================================
-- 1. Webhook ordering guard
-- =============================================================================
-- Track the timestamp of the last provider event actually applied, and
-- reject (no-op) any incoming event older than what's already on file. This
-- is option (a) from the QA matrix's gap writeup: trust each event's own
-- envelope timestamp rather than assuming delivery order. Razorpay doesn't
-- guarantee a monotonic sequence number across event types, but does stamp
-- every webhook envelope with `created_at` (unix seconds) — that's the
-- signal threaded through from razorpay-webhook/index.ts below.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

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
      provider_customer_id     = EXCLUDED.provider_customer_id,
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

-- =============================================================================
-- 2. cancel_at auto-flip backstop
-- =============================================================================
-- request_subscription_cancellation() (Plan 5) only sets cancel_at — the
-- actual status flip to 'cancelled' was documented as depending entirely on
-- a Razorpay webhook arriving (which today never even gets triggered, since
-- the provider-side cancel call itself is a still-open TODO in
-- manage-subscription/index.ts). This function is a DB-side reconciliation
-- backstop, intended to be invoked on a daily schedule (see
-- supabase/functions/reconcile-cancellations and
-- .github/workflows/reconcile-cancellations.yml) so a company whose
-- cancel_at has passed loses access even if no webhook ever arrives.
CREATE OR REPLACE FUNCTION flip_expired_cancellations()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flipped_count INT := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT company_id, status AS old_status
    FROM subscriptions
    WHERE cancel_at IS NOT NULL
      AND cancel_at <= NOW()
      AND status NOT IN ('cancelled', 'expired')
  LOOP
    UPDATE subscriptions
      SET status = 'cancelled', updated_at = NOW()
      WHERE company_id = rec.company_id;

    INSERT INTO billing_audit_logs (actor, company_id, action, old_value, new_value)
    VALUES (
      'system-cron', rec.company_id, 'SUBSCRIPTION_AUTO_CANCELLED',
      jsonb_build_object('status', rec.old_status),
      jsonb_build_object('status', 'cancelled')
    );

    flipped_count := flipped_count + 1;
  END LOOP;

  RETURN flipped_count;
END;
$$;

REVOKE ALL ON FUNCTION flip_expired_cancellations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION flip_expired_cancellations() TO service_role;

-- Allow the new audit action value.
ALTER TABLE billing_audit_logs DROP CONSTRAINT IF EXISTS billing_audit_logs_action_check;
ALTER TABLE billing_audit_logs ADD CONSTRAINT billing_audit_logs_action_check
  CHECK (action IN (
    'PLAN_CHANGED', 'TRIAL_GRANTED', 'TRIAL_EXTENDED',
    'DISCOUNT_APPLIED', 'CREDITS_ADDED',
    'SUBSCRIPTION_SUSPENDED', 'SUBSCRIPTION_REACTIVATED',
    'ENTERPRISE_CONTRACT_CREATED', 'SUBSCRIPTION_AUTO_CANCELLED'
  ));
