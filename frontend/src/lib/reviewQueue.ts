/**
 * Pure sort + rollup logic for the SUPERVISOR review queue. Extracted from
 * SupervisorDashboard.tsx (handleTaskReview / handleBulkApprove previously
 * duplicated this rollup branch slightly differently in each handler).
 */

export interface PendingTestLike {
  id: string;
  project_number: string;
  created_at: string;
}

/**
 * Groups rows by project_number (oldest project first, by that project's
 * earliest-created pending row), then orders rows within a project
 * oldest-first. Keeps a supervisor's view of one project's queue visually
 * stable across realtime refetches instead of resorting the whole flat list
 * by created_at, which previously caused rows from different projects to
 * interleave and jump on every debounced invalidation.
 */
export function sortPendingTests<T extends PendingTestLike>(tasks: T[]): T[] {
  const earliestByProject = new Map<string, string>();
  for (const t of tasks) {
    const current = earliestByProject.get(t.project_number);
    if (!current || t.created_at < current) earliestByProject.set(t.project_number, t.created_at);
  }
  return [...tasks].sort((a, b) => {
    if (a.project_number !== b.project_number) {
      const ea = earliestByProject.get(a.project_number)!;
      const eb = earliestByProject.get(b.project_number)!;
      if (ea !== eb) return ea < eb ? -1 : 1;
      return a.project_number < b.project_number ? -1 : 1;
    }
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return 0; // stable: Array.prototype.sort is stable per spec, preserves original order for exact ties
  });
}

/**
 * Given the statuses of the equipment instance's OTHER pending sibling
 * tasks, returns the instance's next status.
 *
 * Contract: the caller MUST pre-filter `remainingSiblingStatuses` down to
 * only the sibling tasks NOT included in the current approval/rework batch
 * before calling this function (both `handleTaskReview` and
 * `handleBulkApprove` already do this by filtering `pendingTests` on the
 * task/instance ids being acted on). This function is intentionally naive
 * about which tasks are "remaining" — it does not itself exclude the
 * task(s) just approved/reworked, so passing the full unfiltered sibling
 * list will produce an incorrect rollup.
 *
 * Any remaining pending sibling keeps the instance at SUBMITTED regardless
 * of this task's own outcome; only once nothing else is pending does this
 * task's own outcome (APPROVED vs REWORK) become the instance's status.
 */
export function rollUpInstanceStatusAfterApproval(
  remainingSiblingStatuses: string[],
  approvedStatus: 'APPROVED' | 'REWORK'
): 'SUBMITTED' | 'APPROVED' | 'REWORK' {
  if (remainingSiblingStatuses.length > 0) return 'SUBMITTED';
  return approvedStatus;
}
