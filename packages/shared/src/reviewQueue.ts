/**
 * Shared review-queue ordering helper. Web's SupervisorDashboard and
 * mobile's SupervisorHomeScreen both render a pending-review list that can
 * mix rows from several projects; an unordered or flatly-timestamp-sorted
 * list visibly reshuffles project-to-project on every refetch. Both clients
 * group by project instead so a supervisor working one project's queue sees
 * a stable view. Web groups by each project's earliest created_at (it has
 * that column available); this version groups by first-seen order in the
 * input array, since not every caller fetches created_at — see
 * docs/superpowers/plans/2026-08-22-mobile-ux-pattern-parity.md Task 3 for
 * the rationale.
 */
export function sortPendingReviewsByProject<T extends { projectId: string }>(rows: T[]): T[] {
  const projectOrder: string[] = [];
  const byProject = new Map<string, T[]>();
  for (const row of rows) {
    if (!byProject.has(row.projectId)) {
      byProject.set(row.projectId, []);
      projectOrder.push(row.projectId);
    }
    byProject.get(row.projectId)!.push(row);
  }
  return projectOrder.flatMap((projectId) => byProject.get(projectId)!);
}
