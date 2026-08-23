// Shapes returned by platform-admin-data's plan-catalog actions. Raw Postgres
// rows (snake_case) plus a few server-computed fields — same posture as
// billingTypes.ts. Kept in sync with the plans / plan_features /
// plan_provider_mapping column lists in
// supabase/migrations/20260812000001_plans_and_plan_features.sql and
// supabase/migrations/20260823000008_plan_admin_provider_price_tracking.sql.

export interface PlanFeatureRow {
  id: string;
  plan_id: string;
  feature_key: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface PlanProviderMapping {
  plan_id: string;
  razorpay_plan_id_monthly: string | null;
  razorpay_plan_id_annual: string | null;
  /** The plan price each mapped Razorpay plan was created at. Razorpay plan
   *  amounts are immutable, so this is the only way to detect that the
   *  advertised price has drifted away from the charged one. */
  monthly_price_inr_at_mapping: number | null;
  annual_price_inr_at_mapping: number | null;
  provider_mode: 'test' | 'live' | null;
  updated_at: string;
}

export interface PriceDrift {
  monthly: boolean;
  annual: boolean;
}

export interface AdminPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price_inr: number | null;
  annual_price_inr: number | null;
  max_users: number | null;
  max_active_projects: number | null;
  is_custom: boolean;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  features: PlanFeatureRow[];
  provider_mapping: PlanProviderMapping | null;
  subscription_count: number;
  /** Subscriptions actually being billed on this plan (active or past_due). */
  billable_subscription_count: number;
  price_drift: PriceDrift;
  /** Mapped ids belong to a different Razorpay mode than the configured key. */
  mode_mismatch: boolean;
}

export interface PlanCatalog {
  plans: AdminPlan[];
  feature_keys: string[];
  provider_mode: 'test' | 'live' | null;
  provider_configured: boolean;
}

/** Editable plan fields. `slug` is create-only — see update_plan's note. */
export interface PlanFormValues {
  slug: string;
  name: string;
  description: string;
  monthly_price_inr: string;
  annual_price_inr: string;
  max_users: string;
  max_active_projects: string;
  is_custom: boolean;
  is_active: boolean;
  is_public: boolean;
}

export const EMPTY_PLAN_FORM: PlanFormValues = {
  slug: '',
  name: '',
  description: '',
  monthly_price_inr: '',
  annual_price_inr: '',
  max_users: '',
  max_active_projects: '',
  is_custom: false,
  is_active: true,
  is_public: true,
};

export function planToForm(plan: AdminPlan): PlanFormValues {
  return {
    slug: plan.slug,
    name: plan.name,
    description: plan.description ?? '',
    monthly_price_inr: plan.monthly_price_inr == null ? '' : String(plan.monthly_price_inr),
    annual_price_inr: plan.annual_price_inr == null ? '' : String(plan.annual_price_inr),
    max_users: plan.max_users == null ? '' : String(plan.max_users),
    max_active_projects: plan.max_active_projects == null ? '' : String(plan.max_active_projects),
    is_custom: plan.is_custom,
    is_active: plan.is_active,
    is_public: plan.is_public,
  };
}

/** Human labels for the plan feature keys. Unknown keys fall back to the key. */
export const FEATURE_LABEL: Record<string, string> = {
  offline_mobile: 'Offline mobile',
  audit_trail: 'Audit trail',
  api_access: 'API access',
  sso: 'SSO',
  multiple_sites: 'Multiple sites',
  custom_workflows: 'Custom workflows',
  advanced_reports: 'Advanced reports',
  advanced_approvals: 'Advanced approvals',
  custom_domain: 'Custom domain',
};

export const COMPANY_FLAG_LABEL: Record<string, string> = {
  ai_reports: 'AI reports',
  bulk_invite: 'Bulk invite',
  project_clone: 'Project clone',
  audit_log_viewer: 'Audit log viewer',
};
