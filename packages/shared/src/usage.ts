/**
 * Live usage snapshot for a company: current counts plus the one tracked
 * event metric (AI report generations). Backed by the get_company_usage()
 * SQL function (supabase/migrations/20260813000008_usage_records_and_get_usage.sql).
 *
 * Does NOT include storage or API-request metrics — this codebase has no
 * file storage or public API surface to meter yet.
 */

export interface UsageSnapshot {
  activeUsers: number;
  activeProjects: number;
  aiReportsThisMonth: number;
}

/** Shape of the JSONB returned by the get_company_usage() SQL function. */
export interface UsageRpcResponse {
  active_users: number;
  active_projects: number;
  ai_reports_this_month: number;
}

export function parseUsage(raw: UsageRpcResponse): UsageSnapshot {
  return {
    activeUsers: raw.active_users,
    activeProjects: raw.active_projects,
    aiReportsThisMonth: raw.ai_reports_this_month,
  };
}
