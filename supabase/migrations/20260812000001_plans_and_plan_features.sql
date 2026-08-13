-- Plans: source of truth for tier pricing/limits. No app-code hardcoding.
CREATE TABLE IF NOT EXISTS plans (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT        NOT NULL UNIQUE,
  name                 TEXT        NOT NULL,
  description          TEXT,
  monthly_price_inr    NUMERIC(12,2),
  annual_price_inr     NUMERIC(12,2),
  max_users            INT,          -- NULL = unlimited
  max_active_projects  INT,          -- NULL = unlimited
  is_custom            BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  is_public            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_features (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID        NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key TEXT        NOT NULL,
  enabled     BOOLEAN     NOT NULL DEFAULT FALSE,
  config      JSONB       NOT NULL DEFAULT '{}'::JSONB,
  UNIQUE (plan_id, feature_key)
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- Plans are public catalog data (pricing page needs anon read of is_public rows).
DROP POLICY IF EXISTS "plans_public_read" ON plans;
CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (is_public = TRUE AND is_active = TRUE);

DROP POLICY IF EXISTS "plan_features_public_read" ON plan_features;
CREATE POLICY "plan_features_public_read" ON plan_features
  FOR SELECT USING (
    plan_id IN (SELECT id FROM plans WHERE is_public = TRUE AND is_active = TRUE)
  );
-- No INSERT/UPDATE/DELETE policy for authenticated/anon — service role only.

-- Seed the four tiers from the current pricing grid.
INSERT INTO plans (slug, name, description, monthly_price_inr, annual_price_inr, max_users, max_active_projects, is_custom)
VALUES
  ('starter',      'Starter',      'For small commissioning teams.',       25000,  250000,  10,  3,    FALSE),
  ('professional', 'Professional', 'For growing commissioning operations.', 60000,  600000,  30,  NULL, FALSE),
  ('business',     'Business',     'For multi-team commissioning operations.', 150000, 1500000, 100, NULL, FALSE),
  ('enterprise',   'Enterprise',   'For utilities and large EPCs.',         NULL,   NULL,    NULL, NULL, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Feature flags per tier (spec §1 grid). enabled=FALSE rows are explicit
-- "not included" markers — absence of a row also means "not included"
-- (get_company_entitlements defaults missing keys to false).
INSERT INTO plan_features (plan_id, feature_key, enabled)
SELECT p.id, f.feature_key, f.enabled
FROM plans p
CROSS JOIN LATERAL (
  VALUES
    ('offline_mobile', TRUE),
    ('audit_trail', TRUE),
    ('api_access', p.slug IN ('business','enterprise')),
    ('sso', p.slug IN ('business','enterprise')),
    ('multiple_sites', p.slug IN ('business','enterprise')),
    ('custom_workflows', p.slug IN ('business','enterprise')),
    ('advanced_reports', p.slug != 'starter'),
    ('advanced_approvals', p.slug != 'starter')
) AS f(feature_key, enabled)
ON CONFLICT (plan_id, feature_key) DO NOTHING;
