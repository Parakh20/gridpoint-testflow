// Plan feature keys. MUST stay in sync with packages/shared/src/billing.ts's
// FEATURES map and the keys seeded in
// supabase/migrations/20260812000001_plans_and_plan_features.sql — a key that
// exists on only one side is silently false in useFeatureEntitlement, with no
// error anywhere.
//
// Same relative-import posture as _shared/addon_keys.ts: Deno has no bundler
// resolving the `@testflow/shared` bare specifier here.
export const PLAN_FEATURE_KEYS = [
  'offline_mobile',
  'audit_trail',
  'api_access',
  'sso',
  'multiple_sites',
  'custom_workflows',
  'advanced_reports',
  'advanced_approvals',
  'custom_domain',
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];

// Per-tenant operational flags on companies.features (frontend/src/lib/features.ts).
// These are a SEPARATE namespace from plan features above: kill switches for
// shipped functionality, not billing entitlements. Defaults are open — an
// absent key means enabled.
export const COMPANY_FEATURE_FLAGS = [
  'ai_reports',
  'bulk_invite',
  'project_clone',
  'audit_log_viewer',
] as const;

export type CompanyFeatureFlag = (typeof COMPANY_FEATURE_FLAGS)[number];
