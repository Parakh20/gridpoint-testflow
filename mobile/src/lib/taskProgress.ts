/**
 * Pure progress-rollup math shared across TaskListScreen, EquipmentDetailScreen,
 * and ProjectOverviewScreen. Extracted because the same `Math.round((done/total)*100)`
 * and "count SUBMITTED/APPROVED as done, flag any REWORK" logic was hand-written
 * five times across those three files with inconsistent zero-division guards.
 */

/** Percent complete, rounded to the nearest integer. 0/0 returns 0, not NaN. */
export function computeProgressPct(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

export type TaskCountRollup = {
  total: number;
  done: number;
  hasRework: boolean;
  pct: number;
};

/**
 * Rolls up any array of status-bearing rows into total/done/hasRework/pct.
 * "Done" = SUBMITTED or APPROVED, matching every call site's existing
 * definition (TaskListScreen's instanceGroups reduction, EquipmentDetailScreen's
 * `allDone`/`progress`, ProjectOverviewScreen's per-instance summary).
 */
export function rollUpTaskCounts<T extends { status: string }>(
  tasks: readonly T[]
): TaskCountRollup {
  let done = 0;
  let hasRework = false;
  for (const t of tasks) {
    if (t.status === 'SUBMITTED' || t.status === 'APPROVED') done++;
    if (t.status === 'REWORK') hasRework = true;
  }
  return { total: tasks.length, done, hasRework, pct: computeProgressPct(done, tasks.length) };
}
