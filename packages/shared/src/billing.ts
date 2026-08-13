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

/** Structured shape returned by get_resource_limit_status / the create-user 403 body. */
export interface UpgradeReason {
  code: 'PLAN_LIMIT_REACHED';
  resource: 'users' | 'projects';
  current: number | null;
  limit: number | null;
  required_plan: PlanSlug | null;
}

/** A resource that would exceed the target plan's limit if downgraded now. */
export interface DowngradeBlocker {
  resource: 'users' | 'active_projects';
  current: number;
  targetLimit: number;
}

/** Shape returned by check_plan_downgrade_feasibility() / request_plan_downgrade(). */
export interface DowngradeFeasibilityRpcResponse {
  feasible?: boolean;
  scheduled?: boolean;
  blockers: Array<{ resource: 'users' | 'active_projects'; current: number; target_limit: number }>;
}

export interface DowngradeFeasibility {
  allowed: boolean;
  blockers: DowngradeBlocker[];
}

export function parseDowngradeFeasibility(raw: DowngradeFeasibilityRpcResponse): DowngradeFeasibility {
  return {
    allowed: raw.feasible ?? raw.scheduled ?? false,
    blockers: raw.blockers.map((b) => ({
      resource: b.resource,
      current: b.current,
      targetLimit: b.target_limit,
    })),
  };
}
