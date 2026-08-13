-- Billing audit log — append-only record of every platform-admin action that
-- affects a tenant's subscription. NOT tenant data; reached only via
-- platform-admin-data (service role). Same posture as leads/lead_activities
-- (see 20260530000003_create_leads_tables.sql): RLS enabled, no policies.
CREATE TABLE IF NOT EXISTS public.billing_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor       text NOT NULL,              -- platform admin identifier (no auth session to key off; pass a label from the client, e.g. "platform-admin")
  company_id  uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  action      text NOT NULL
                CHECK (action IN (
                  'PLAN_CHANGED', 'TRIAL_GRANTED', 'TRIAL_EXTENDED',
                  'DISCOUNT_APPLIED', 'CREDITS_ADDED',
                  'SUBSCRIPTION_SUSPENDED', 'SUBSCRIPTION_REACTIVATED',
                  'ENTERPRISE_CONTRACT_CREATED'
                )),
  old_value   jsonb,
  new_value   jsonb,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_company ON public.billing_audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_action  ON public.billing_audit_logs(action);

ALTER TABLE public.billing_audit_logs ENABLE ROW LEVEL SECURITY;
-- No policies — service role (platform-admin-data) only. Do not add one.

-- Discount/credit support on subscriptions — additive, nullable-first.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) CHECK (discount_pct IS NULL OR (discount_pct >= 0 AND discount_pct <= 100)),
  ADD COLUMN IF NOT EXISTS credit_balance_inr NUMERIC(12,2) NOT NULL DEFAULT 0;
