-- Applies a scheduled plan downgrade (Task 1/3) at the next webhook-reported
-- period rollover. This re-declares upsert_subscription on top of the
-- current definition from 20260813000005_final_review_fixes.sql (which
-- resolves plan_id via plan_provider_mapping and RAISE WARNINGs on an
-- unresolved mapping) — that logic is preserved unchanged; the only addition
-- is the pending-downgrade override applied after the upsert.
CREATE OR REPLACE FUNCTION upsert_subscription(
  _company_id UUID,
  _provider_sub_id TEXT,
  _provider_cust_id TEXT,
  _provider_plan_id TEXT,
  _status TEXT,
  _period_start TIMESTAMPTZ,
  _period_end TIMESTAMPTZ,
  _seat_count INT,
  _raw JSONB
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
BEGIN
  -- Read the row's state BEFORE upserting, so we can detect "a new period
  -- actually started" (new _period_start is after what we had on file).
  SELECT current_period_end, pending_plan_id
    INTO prior_period_end, prior_pending_plan_id
    FROM subscriptions WHERE company_id = _company_id;

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
    current_period_start, current_period_end, seat_count, raw_provider_payload
  )
  VALUES (
    _company_id, 'razorpay', _provider_sub_id, _provider_cust_id,
    _provider_plan_id, resolved_plan_id, resolved_interval, _status,
    _period_start, _period_end, _seat_count, _raw
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
      updated_at               = NOW()
  RETURNING id INTO sub_id;

  -- Apply a scheduled downgrade only once the provider confirms a new
  -- period actually started (prior_period_end existed and the new start
  -- is at/after it). A brand-new subscription (prior_period_end NULL) has
  -- no pending downgrade to apply, and a mid-period status update (e.g.
  -- payment.failed, same period) must NOT apply it early. This runs after
  -- the upsert above so it wins over whatever plan_id the webhook's own
  -- payload resolved to (Razorpay won't reflect the downgrade until
  -- Plan 2 wires the provider-side "change subscription plan" call).
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
