/**
 * Pure status-derivation logic for the ENGINEER test-entry workspace.
 * Extracted from EngineerProjectDetail.tsx so it's independently testable
 * and reusable by EquipmentUnitCard/DraftStatusIndicator (Tasks 3-4).
 */

export type EquipmentStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REWORK'
  | 'APPROVED';

/**
 * Rolls up an equipment instance's status from its child test_tasks'
 * statuses. Branch order matters — REWORK dominates SUBMITTED/IN_PROGRESS,
 * and the length guard on the first branch prevents `[].every(...)`
 * (vacuously true in JS) from misclassifying an empty task list as
 * APPROVED. Do not reorder these branches without re-reading this file's
 * hand-traced cases in the plan doc.
 */
export function deriveEquipmentStatus(taskStatuses: string[], hasAssignee: boolean): EquipmentStatus {
  if (taskStatuses.length > 0 && taskStatuses.every(s => s === 'APPROVED')) return 'APPROVED';
  if (taskStatuses.includes('REWORK')) return 'REWORK';
  if (taskStatuses.includes('SUBMITTED')) return 'SUBMITTED';
  if (taskStatuses.some(s => s === 'IN_PROGRESS' || s === 'APPROVED')) return 'IN_PROGRESS';
  return hasAssignee ? 'ASSIGNED' : 'UNASSIGNED';
}

export type DraftStatus = 'submitted' | 'approved' | 'draft' | 'clean';

/**
 * A task is "draft" only when it has unsaved local form state AND no
 * persisted test_records row yet — once a record exists, local formData
 * just mirrors the saved state and isn't a pending draft anymore.
 */
export function getDraftStatus(
  task: { status: string; existing_record?: unknown },
  formData: Record<string, unknown> | undefined
): DraftStatus {
  if (task.status === 'SUBMITTED') return 'submitted';
  if (task.status === 'APPROVED') return 'approved';
  if (!task.existing_record && formData && Object.keys(formData).length > 0) return 'draft';
  return 'clean';
}
