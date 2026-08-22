-- Extend billing_audit_logs.action's CHECK constraint to allow the two new
-- action values platform-admin-data emits for subscription add-on
-- management: 'ADDON_CREATED' (admin_create_addon) and 'ADDON_CANCELLED'
-- (admin_cancel_addon). Additive only — every existing action value from
-- 20260814000002_webhook_ordering_and_cancel_backstop.sql (the most recent
-- migration touching this constraint) is carried forward unchanged, so
-- existing rows all still satisfy the new CHECK.
ALTER TABLE billing_audit_logs DROP CONSTRAINT IF EXISTS billing_audit_logs_action_check;
ALTER TABLE billing_audit_logs ADD CONSTRAINT billing_audit_logs_action_check
  CHECK (action IN (
    'PLAN_CHANGED', 'TRIAL_GRANTED', 'TRIAL_EXTENDED',
    'DISCOUNT_APPLIED', 'CREDITS_ADDED',
    'SUBSCRIPTION_SUSPENDED', 'SUBSCRIPTION_REACTIVATED',
    'ENTERPRISE_CONTRACT_CREATED', 'SUBSCRIPTION_AUTO_CANCELLED',
    'ADDON_CREATED', 'ADDON_CANCELLED'
  ));
