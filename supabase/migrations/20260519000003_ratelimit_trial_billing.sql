-- =============================================================================
-- Migration: Rate limits + trial mode + feature flags + billing scaffold
-- =============================================================================


-- =============================================================================
-- 1. RATE LIMITS
-- =============================================================================
-- Per-key sliding window counter. Used by Edge Functions to protect against
-- runaway abuse (e.g. compromised admin token spamming create-user).

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key   TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INT         NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Atomic check + increment. Returns TRUE if the call is allowed.
-- Each unique (key, window_minute) row holds a count; we sum across the
-- look-back window to enforce a per-N-minute cap.
CREATE OR REPLACE FUNCTION rate_limit_check(
  _key TEXT,
  _limit INT,
  _window_minutes INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_minute TIMESTAMPTZ := date_trunc('minute', NOW());
  total INT;
BEGIN
  -- Sum recent counts within the window
  SELECT COALESCE(SUM(count), 0) INTO total
  FROM rate_limits
  WHERE bucket_key = _key
    AND window_start > NOW() - (_window_minutes || ' minutes')::INTERVAL;

  IF total >= _limit THEN
    RETURN FALSE;
  END IF;

  -- Increment current minute's counter
  INSERT INTO rate_limits (bucket_key, window_start, count)
  VALUES (_key, current_minute, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET count = rate_limits.count + 1;

  RETURN TRUE;
END;
$$;

-- Periodic cleanup: drop rows older than 24h. Caller runs this opportunistically.
CREATE OR REPLACE FUNCTION rate_limit_gc()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';
$$;


-- =============================================================================
-- 2. TRIAL MODE + FEATURE FLAGS
-- =============================================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Default trial: 14 days from creation. Only applies to newly created rows.
-- (Existing tenants keep NULL trial_ends_at which means "no trial — active customer".)
CREATE OR REPLACE FUNCTION set_default_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_default_trial ON companies;
CREATE TRIGGER trg_companies_default_trial
  BEFORE INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION set_default_trial();

-- Helper: does the caller's company have a given feature flag enabled?
-- Defaults to TRUE for unspecified flags so existing tenants don't break.
CREATE OR REPLACE FUNCTION has_feature(_flag TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (features->>_flag)::BOOLEAN FROM companies WHERE id = my_company_id()),
    TRUE
  );
$$;


-- =============================================================================
-- 3. SUBSCRIPTIONS (Razorpay scaffold — billing wiring filled in later)
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               UUID        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  provider                 TEXT        NOT NULL DEFAULT 'razorpay',
  provider_subscription_id TEXT        UNIQUE,
  provider_customer_id     TEXT,
  plan_id                  TEXT,
  status                   TEXT        NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','paused','past_due','cancelled','expired')),
  seat_count               INT         NOT NULL DEFAULT 0,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at                TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_provider_payload     JSONB
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenant read access: a company sees only its own subscription
CREATE POLICY "subscriptions_select_same_company"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

-- No INSERT/UPDATE/DELETE for regular users — service role (webhook) only


-- Idempotent upsert helper for the webhook to call
CREATE OR REPLACE FUNCTION upsert_subscription(
  _company_id UUID,
  _provider_sub_id TEXT,
  _provider_cust_id TEXT,
  _plan_id TEXT,
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
    plan_id, status, current_period_start, current_period_end, seat_count, raw_provider_payload
  )
  VALUES (
    _company_id, 'razorpay', _provider_sub_id, _provider_cust_id,
    _plan_id, _status, _period_start, _period_end, _seat_count, _raw
  )
  ON CONFLICT (company_id) DO UPDATE
  SET provider_subscription_id = EXCLUDED.provider_subscription_id,
      provider_customer_id     = EXCLUDED.provider_customer_id,
      plan_id                  = EXCLUDED.plan_id,
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
