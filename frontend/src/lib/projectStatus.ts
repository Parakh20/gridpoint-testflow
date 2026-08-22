/**
 * Shared overdue check for a project: past its end_date and not already
 * CLOSED. Previously duplicated across GMDashboard.tsx, ProjectDetail.tsx,
 * NeedsAttentionPanel.tsx (inlined inside its reasonFor()), and
 * ReportsList.tsx — this is the single source of truth those now import.
 */
export function isOverdue(endDate: string | null | undefined, status: string): boolean {
  return !!endDate && new Date(endDate) < new Date() && status !== 'CLOSED';
}
