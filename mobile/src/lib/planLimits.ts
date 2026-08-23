/**
 * Plan-limit messaging for mobile.
 *
 * The web app opens an UpgradeModal with a plan-comparison CTA; mobile has no
 * billing surface (billing is SUPERADMIN-only and lives on the web app), so
 * the same information is delivered as a single toast line here.
 *
 * Backed by the same `check_can_create_project` RPC the web NewProject page
 * calls, so the wording and the gate never drift apart.
 */

import type { PlanSlug } from '@testflow/shared';

/** Shape of the JSONB returned by check_can_create_project(). */
export interface CanCreateProjectStatus {
  allowed: boolean;
  current: number | null;
  limit: number | null;
  required_plan: PlanSlug | null;
}

/**
 * Copy for a blocked project creation. `limit` may be null when the RPC didn't
 * run (the RLS fallback path), in which case the message stays generic rather
 * than inventing a number.
 */
export function planLimitMessage(status: Partial<CanCreateProjectStatus> | null): string {
  const limit = status?.limit ?? null;
  const current = status?.current ?? null;
  const requiredPlan = status?.required_plan ?? null;

  const count =
    limit !== null && current !== null
      ? ` (${current} of ${limit} used)`
      : limit !== null
        ? ` (plan allows ${limit})`
        : '';

  const upgrade = requiredPlan
    ? ` Ask your administrator to upgrade to the ${requiredPlan} plan.`
    : ' Ask your administrator to upgrade the plan.';

  return `Active project limit reached${count}.${upgrade}`;
}

/** True when a Supabase error is the RLS rejection that a plan gate produces. */
export function isPlanGateRlsError(err: unknown): boolean {
  const message = (err as { message?: string })?.message ?? '';
  return /row-level security/i.test(message);
}
