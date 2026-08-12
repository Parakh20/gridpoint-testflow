-- The old subscriptions.plan_id held Razorpay's external plan id.
-- Rename it so we can introduce an internal FK plan_id without breaking
-- the razorpay-webhook function's upsert_subscription() calls.
-- Guarded so `supabase db push` stays idempotent on re-run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'plan_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE subscriptions RENAME COLUMN plan_id TO provider_plan_id;
  END IF;
END $$;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS billing_interval TEXT
    CHECK (billing_interval IN ('monthly', 'annual'));

-- upsert_subscription() (called by the webhook) writes provider_plan_id,
-- not plan_id — update its signature to match the rename so it keeps compiling.
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
BEGIN
  INSERT INTO subscriptions (
    company_id, provider, provider_subscription_id, provider_customer_id,
    provider_plan_id, status, current_period_start, current_period_end, seat_count, raw_provider_payload
  )
  VALUES (
    _company_id, 'razorpay', _provider_sub_id, _provider_cust_id,
    _provider_plan_id, _status, _period_start, _period_end, _seat_count, _raw
  )
  ON CONFLICT (company_id) DO UPDATE
  SET provider_subscription_id = EXCLUDED.provider_subscription_id,
      provider_customer_id     = EXCLUDED.provider_customer_id,
      provider_plan_id         = EXCLUDED.provider_plan_id,
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
