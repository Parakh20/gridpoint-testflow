-- Razorpay plan ids for each billing interval. Set these via the Razorpay
-- dashboard when creating each plan there, then update these columns
-- (service role only — no UI for this yet, it's operator-configured).
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_monthly TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_annual  TEXT UNIQUE;

-- upsert_subscription() now resolves the internal plans.id from Razorpay's
-- external plan id (checking both monthly and annual mapping columns) and
-- writes both plan_id and billing_interval. If no mapping exists yet
-- (operator hasn't configured razorpay_plan_id_* for this plan), plan_id
-- stays NULL and get_company_entitlements() falls through to its trial
-- fallback — same graceful-degradation behavior as before this migration,
-- not a new failure mode.
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
BEGIN
  SELECT id, 'monthly' INTO resolved_plan_id, resolved_interval
  FROM plans WHERE razorpay_plan_id_monthly = _provider_plan_id;

  IF resolved_plan_id IS NULL THEN
    SELECT id, 'annual' INTO resolved_plan_id, resolved_interval
    FROM plans WHERE razorpay_plan_id_annual = _provider_plan_id;
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
  RETURN sub_id;
END;
$$;
