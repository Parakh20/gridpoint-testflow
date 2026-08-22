/**
 * Shared overdue check for a project: past its end_date and not already
 * CLOSED. Previously duplicated 3 ways (GMDashboard.tsx, ProjectDetail.tsx,
 * and inlined inside NeedsAttentionPanel.tsx's reasonFor()) — this is the
 * single source of truth all three now import.
 */
export function isOverdue(endDate: string | null | undefined, status: string): boolean {
  return !!endDate && new Date(endDate) < new Date() && status !== 'CLOSED';
}
