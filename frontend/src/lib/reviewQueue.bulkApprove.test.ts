// frontend/src/lib/reviewQueue.bulkApprove.test.ts
import { describe, it, expect } from 'vitest';
import { rollUpInstanceStatusAfterApproval } from './reviewQueue';

describe('rollUpInstanceStatusAfterApproval — concurrent bulk-approve shape', () => {
  it('keeps the instance at SUBMITTED when a sibling task was submitted by another reviewer mid-batch', () => {
    // Simulates: supervisor A selects 2 of 3 pending tasks on an equipment
    // instance and bulk-approves; supervisor B submits a 3rd, previously
    // IN_PROGRESS task for the same instance in between A's select and A's
    // approve. The server-side .eq('status','SUBMITTED') guard (not
    // reproduced here — that's Postgres, not this pure function) skips
    // rows that already moved; this function only needs to correctly roll
    // up given whatever the caller determines is "still remaining" after
    // that guard runs.
    const remainingAfterGuard = ['SUBMITTED']; // the 3rd task, now pending
    expect(rollUpInstanceStatusAfterApproval(remainingAfterGuard, 'APPROVED')).toBe('SUBMITTED');
  });

  it('resolves to APPROVED once the last concurrently-submitted sibling is also cleared', () => {
    expect(rollUpInstanceStatusAfterApproval([], 'APPROVED')).toBe('APPROVED');
  });
});
