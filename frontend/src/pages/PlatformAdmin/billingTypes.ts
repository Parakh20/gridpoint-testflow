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
