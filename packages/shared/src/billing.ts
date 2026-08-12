/**
 * Billing/entitlement types shared between web and mobile.
 * Values here must match the `feature_key` strings seeded in
 * supabase/migrations/20260812000001_plans_and_plan_features.sql —
 * changing a key on one side without the other silently breaks entitlement checks.
 */

export type PlanSlug = 'starter' | 'professional' | 'business' | 'enterprise';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'expired';

export type BillingInterval = 'monthly' | 'annual';

export const FEATURES = {
  OFFLINE_MOBILE: 'offline_mobile',
  ADVANCED_REPORTS: 'advanced_reports',
  ADVANCED_APPROVALS: 'advanced_approvals',
  CUSTOM_WORKFLOWS: 'custom_workflows',
  API_ACCESS: 'api_access',
  SSO: 'sso',
  MULTIPLE_SITES: 'multiple_sites',
  AUDIT_TRAIL: 'audit_trail',
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

export interface Entitlements {
  planSlug: PlanSlug;
  planName: string;
  maxUsers: number | null;
  maxActiveProjects: number | null;
  isCustom: boolean;
  features: Partial<Record<FeatureKey, boolean>>;
}

/** Shape of the JSONB returned by the get_company_entitlements() SQL function. */
export interface EntitlementsRpcResponse {
  plan_slug: PlanSlug;
  plan_name: string;
  max_users: number | null;
  max_active_projects: number | null;
  is_custom: boolean;
  features: Record<string, boolean>;
}

export function parseEntitlements(raw: EntitlementsRpcResponse): Entitlements {
  return {
    planSlug: raw.plan_slug,
    planName: raw.plan_name,
    maxUsers: raw.max_users,
    maxActiveProjects: raw.max_active_projects,
    isCustom: raw.is_custom,
    features: raw.features as Partial<Record<FeatureKey, boolean>>,
  };
}
