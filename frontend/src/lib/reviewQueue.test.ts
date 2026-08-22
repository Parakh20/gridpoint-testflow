import { describe, it, expect } from 'vitest';
import { sortPendingTests, rollUpInstanceStatusAfterApproval, type PendingTestLike } from './reviewQueue';

function task(overrides: Partial<PendingTestLike>): PendingTestLike {
  return {
    id: 't1',
    project_number: 'TF-1000',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('sortPendingTests', () => {
  it('groups rows by project_number, oldest project first', () => {
    const rows = [
      task({ id: 'a', project_number: 'TF-2000', created_at: '2026-01-02T00:00:00Z' }),
      task({ id: 'b', project_number: 'TF-1000', created_at: '2026-01-03T00:00:00Z' }),
      task({ id: 'c', project_number: 'TF-2000', created_at: '2026-01-01T00:00:00Z' }),
    ];
    const sorted = sortPendingTests(rows);
    expect(sorted.map(r => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('is stable for rows with identical project_number and created_at', () => {
    const rows = [task({ id: 'x' }), task({ id: 'y' })];
    expect(sortPendingTests(rows).map(r => r.id)).toEqual(['x', 'y']);
  });
});

describe('rollUpInstanceStatusAfterApproval', () => {
  it('returns APPROVED when no siblings remain and the task was approved', () => {
    expect(rollUpInstanceStatusAfterApproval([], 'APPROVED')).toBe('APPROVED');
  });

  it('returns SUBMITTED when siblings remain, regardless of this task\'s outcome', () => {
    expect(rollUpInstanceStatusAfterApproval(['SUBMITTED'], 'APPROVED')).toBe('SUBMITTED');
    expect(rollUpInstanceStatusAfterApproval(['SUBMITTED'], 'REWORK')).toBe('SUBMITTED');
  });

  it('returns REWORK when no siblings remain and the task was sent to rework', () => {
    expect(rollUpInstanceStatusAfterApproval([], 'REWORK')).toBe('REWORK');
  });
});
