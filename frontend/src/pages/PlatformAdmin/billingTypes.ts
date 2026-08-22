export const BILLING_AUDIT_ACTIONS = [
  'PLAN_CHANGED',
  'TRIAL_GRANTED',
  'TRIAL_EXTENDED',
  'DISCOUNT_APPLIED',
  'CREDITS_ADDED',
  'SUBSCRIPTION_SUSPENDED',
  'SUBSCRIPTION_REACTIVATED',
  'ENTERPRISE_CONTRACT_CREATED',
  'ADDON_CREATED',
  'ADDON_CANCELLED',
] as const;
export type BillingAuditAction = (typeof BILLING_AUDIT_ACTIONS)[number];

export const ACTION_LABEL: Record<BillingAuditAction, string> = {
  PLAN_CHANGED: 'Plan changed',
  TRIAL_GRANTED: 'Trial granted',
  TRIAL_EXTENDED: 'Trial extended',
  DISCOUNT_APPLIED: 'Discount applied',
  CREDITS_ADDED: 'Credits added',
  SUBSCRIPTION_SUSPENDED: 'Suspended',
  SUBSCRIPTION_REACTIVATED: 'Reactivated',
  ENTERPRISE_CONTRACT_CREATED: 'Enterprise contract created',
  ADDON_CREATED: 'Add-on created',
  ADDON_CANCELLED: 'Add-on cancelled',
};

export type SubscriptionStatus = 'trialing' | 'active' | 'paused' | 'past_due' | 'cancelled' | 'expired';

export interface Subscription {
  id: string;
  company_id: string;
  status: SubscriptionStatus;
  billing_interval: 'monthly' | 'annual' | null;
  current_period_end: string | null;
  seat_count: number;
  discount_pct: number | null;
  credit_balance_inr: number;
  companies: { name: string; slug: string; is_active: boolean } | null;
  plans: {
    slug: string;
    name: string;
    monthly_price_inr: number | null;
    annual_price_inr: number | null;
    max_users: number | null;
    max_active_projects: number | null;
  } | null;
}

export interface BillingOverview {
  mrr: number;
  arr: number;
  active_count: number;
  trialing_count: number;
  past_due_count: number;
  cancelled_count: number;
}

export interface BillingAuditLog {
  id: string;
  actor: string;
  company_id: string | null;
  action: BillingAuditAction;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// EnterpriseContract/SubscriptionAddon: platform-admin-data's get_billing_extras
// action returns raw Postgres rows (snake_case, `.select('*')`) — not the
// camelCase parsed shapes in packages/shared/src/billing.ts (those assume a
// parse function like parseEntitlements() that doesn't exist for these two
// tables). Kept local and in sync with the enterprise_contracts /
// subscription_addons column lists in
// supabase/migrations/20260813000013_enterprise_contracts_and_addons.sql.
export interface EnterpriseContract {
  id: string;
  company_id: string;
  custom_monthly_price_inr: number | null;
  custom_annual_price_inr: number | null;
  max_users: number | null;
  max_active_projects: number | null;
  max_storage_gb: number | null;
  contract_start: string;
  contract_end: string | null;
  sla_level: string | null;
  support_level: string | null;
  custom_features: Record<string, boolean>;
}

export interface SubscriptionAddon {
  id: string;
  subscription_id: string;
  addon_key: string;
  quantity: number;
  unit_price_inr: number | null;
  status: 'active' | 'cancelled';
  created_at: string;
}
