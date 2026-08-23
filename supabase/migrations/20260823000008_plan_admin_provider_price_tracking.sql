-- Plan self-service support for the platform admin panel.
--
-- Two things are needed before an operator can safely edit a plan's price from
-- admin.optimustesting.com:
--
--   1. A record of WHICH price each Razorpay plan id was created at. Razorpay
--      plan amounts are immutable, so editing plans.monthly_price_inr changes
--      what the pricing page advertises but NOT what a new subscriber is
--      actually charged (manage-subscription resolves the provider plan id
--      from plan_provider_mapping). Without the amount stored alongside the
--      mapping there is no way to detect that drift — it would only surface as
--      a customer being billed the wrong amount.
--
--   2. A record of which Razorpay MODE the ids belong to. Every id currently
--      in this table was created against Test Mode keys (see
--      20260822000014 / 20260822000015). At the live cutover the ids must be
--      re-created with Live keys; a live RAZORPAY_KEY_ID pointed at test-mode
--      plan ids fails at checkout, and the operator has no way to see that
--      from the panel today.
--
-- Both columns are written by platform-admin-data whenever it sets or creates
-- a mapping. Nothing else reads them — upsert_subscription's plan resolution
-- is untouched.

ALTER TABLE plan_provider_mapping
  ADD COLUMN IF NOT EXISTS monthly_price_inr_at_mapping NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS annual_price_inr_at_mapping  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS provider_mode TEXT
    CHECK (provider_mode IS NULL OR provider_mode IN ('test', 'live')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill: 20260822000015_charm_pricing.sql set plans.monthly/annual_price_inr
-- and repointed plan_provider_mapping at freshly-created Razorpay plans in the
-- same transaction, so the current plan prices ARE the amounts the currently
-- mapped Razorpay plans were created at. Every one of those was created with
-- Test Mode keys.
UPDATE plan_provider_mapping m
SET monthly_price_inr_at_mapping = COALESCE(m.monthly_price_inr_at_mapping, p.monthly_price_inr),
    annual_price_inr_at_mapping  = COALESCE(m.annual_price_inr_at_mapping,  p.annual_price_inr),
    provider_mode                = COALESCE(m.provider_mode, 'test')
FROM plans p
WHERE p.id = m.plan_id;

COMMENT ON COLUMN plan_provider_mapping.monthly_price_inr_at_mapping IS
  'plans.monthly_price_inr as it stood when razorpay_plan_id_monthly was mapped. Drift from the live plan price means the pricing page advertises one number and Razorpay charges another.';
COMMENT ON COLUMN plan_provider_mapping.annual_price_inr_at_mapping IS
  'plans.annual_price_inr as it stood when razorpay_plan_id_annual was mapped.';
COMMENT ON COLUMN plan_provider_mapping.provider_mode IS
  'Razorpay mode the mapped plan ids were created in. test-mode ids do not exist in the live environment.';

-- Audit actions for the new platform-admin-data plan-management actions.
-- Additive: every existing value from 20260822000001 is carried forward, so
-- existing rows still satisfy the CHECK.
ALTER TABLE billing_audit_logs DROP CONSTRAINT IF EXISTS billing_audit_logs_action_check;
ALTER TABLE billing_audit_logs ADD CONSTRAINT billing_audit_logs_action_check
  CHECK (action IN (
    'PLAN_CHANGED', 'TRIAL_GRANTED', 'TRIAL_EXTENDED',
    'DISCOUNT_APPLIED', 'CREDITS_ADDED',
    'SUBSCRIPTION_SUSPENDED', 'SUBSCRIPTION_REACTIVATED',
    'ENTERPRISE_CONTRACT_CREATED', 'SUBSCRIPTION_AUTO_CANCELLED',
    'ADDON_CREATED', 'ADDON_CANCELLED',
    'PLAN_CATALOG_CREATED', 'PLAN_CATALOG_UPDATED',
    'PLAN_FEATURE_UPDATED', 'PLAN_PROVIDER_MAPPING_UPDATED',
    'COMPANY_FEATURE_FLAGS_UPDATED'
  ));

-- billing_audit_logs.company_id is nullable (ON DELETE SET NULL, no NOT NULL)
-- and the plan-catalog actions above are platform-wide, not company-scoped —
-- they are written with company_id = NULL by design.
