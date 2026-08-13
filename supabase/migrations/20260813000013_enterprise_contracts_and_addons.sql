-- Enterprise contracts: per-customer custom pricing/limits/SLA. A company
-- with an active contract has its plan's numeric limits and features fully
-- overridden (not merged) by this row — see get_company_entitlements() in
-- Task 2 for the resolution order.
CREATE TABLE IF NOT EXISTS enterprise_contracts (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  custom_monthly_price_inr  NUMERIC(12,2),
  custom_annual_price_inr   NUMERIC(12,2),
  max_users                 INT,          -- NULL = unlimited, same convention as plans.max_users
  max_active_projects       INT,          -- NULL = unlimited
  max_storage_gb            INT,          -- NULL = unlimited
  contract_start            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contract_end              TIMESTAMPTZ,  -- NULL = open-ended
  sla_level                 TEXT,
  support_level             TEXT,
  custom_features           JSONB       NOT NULL DEFAULT '{}'::JSONB,  -- feature_key -> enabled, merged on top of the plan's own features
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_company ON enterprise_contracts(company_id);

-- Subscription add-ons: incremental grants layered onto whatever plan (or
-- enterprise contract) a company already has. quantity is the RAW
-- entitlement delta for numeric addon_keys (extra_users, extra_projects) —
-- see this plan's Global Constraints for why pricing is deliberately kept
-- out of this table's meaning. Feature-flag addon_keys (api_access, sso,
-- dedicated_environment, priority_sla, custom_integration) ignore quantity
-- entirely — their mere presence with status='active' grants the feature.
CREATE TABLE IF NOT EXISTS subscription_addons (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID       NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  addon_key      TEXT        NOT NULL
    CHECK (addon_key IN ('extra_users', 'extra_projects', 'api_access', 'sso', 'dedicated_environment', 'priority_sla', 'custom_integration')),
  quantity       INT         NOT NULL DEFAULT 0,
  unit_price_inr NUMERIC(12,2),
  status         TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_addons_subscription ON subscription_addons(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_addons_status ON subscription_addons(status) WHERE status = 'active';

ALTER TABLE enterprise_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;

-- Tenant read access only, same pattern as subscriptions (20260519000003):
-- a company sees its own contract/addons, no INSERT/UPDATE/DELETE for
-- regular users — service role (a later plan's admin/purchase flow) only.
DROP POLICY IF EXISTS "enterprise_contracts_select_same_company" ON enterprise_contracts;
CREATE POLICY "enterprise_contracts_select_same_company"
  ON enterprise_contracts FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

DROP POLICY IF EXISTS "subscription_addons_select_same_company" ON subscription_addons;
CREATE POLICY "subscription_addons_select_same_company"
  ON subscription_addons FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (SELECT id FROM subscriptions WHERE company_id = my_company_id())
  );
