/**
 * Status enums shared between web and mobile.
 * Status colors are kept platform-specific (Tailwind classes vs RN style
 * tokens), but the rank ordering and enum values live here.
 */

export type ProjectStatus = 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'CLOSED';
export type TestStatus = 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REWORK';

/** Engineer-editable test statuses — used by the optimistic-concurrency guard on submit. */
export const ENGINEER_EDITABLE_TEST_STATUSES: ReadonlyArray<TestStatus> = [
  'DRAFT',
  'IN_PROGRESS',
  'REWORK',
];

/** Project statuses where scope is editable. */
export const PROJECT_SCOPE_EDITABLE_STATUSES: ReadonlyArray<ProjectStatus> = [
  'DRAFT',
  'APPROVED',
];

/** Used by Active-first sort on project lists. Lower = sorts earlier. */
export const PROJECT_STATUS_RANK: Record<ProjectStatus, number> = {
  ACTIVE: 0,
  APPROVED: 1,
  DRAFT: 2,
  CLOSED: 3,
};
