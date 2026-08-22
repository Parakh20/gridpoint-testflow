import { describe, it, expect } from '@jest/globals';
import { computeProgressPct, rollUpTaskCounts } from './taskProgress';

describe('computeProgressPct', () => {
  it('rounds to the nearest percent', () => {
    expect(computeProgressPct(1, 3)).toBe(33); // 33.33... rounds down
    expect(computeProgressPct(2, 3)).toBe(67); // 66.66... rounds up
  });

  it('returns 100 when done equals total', () => {
    expect(computeProgressPct(4, 4)).toBe(100);
  });

  it('returns 0 for an empty set instead of NaN', () => {
    expect(computeProgressPct(0, 0)).toBe(0);
  });
});

describe('rollUpTaskCounts', () => {
  it('counts SUBMITTED and APPROVED as done, everything else as not done', () => {
    const tasks = [
      { status: 'SUBMITTED' },
      { status: 'APPROVED' },
      { status: 'IN_PROGRESS' },
      { status: 'DRAFT' },
    ];
    const result = rollUpTaskCounts(tasks);
    expect(result).toEqual({ total: 4, done: 2, hasRework: false, pct: 50 });
  });

  it('flags hasRework when any task is REWORK, independent of the done count', () => {
    const tasks = [{ status: 'APPROVED' }, { status: 'REWORK' }];
    const result = rollUpTaskCounts(tasks);
    expect(result.hasRework).toBe(true);
    expect(result.pct).toBe(50);
  });

  it('returns all-zero for an empty task list without dividing by zero', () => {
    expect(rollUpTaskCounts([])).toEqual({ total: 0, done: 0, hasRework: false, pct: 0 });
  });

  it('returns pct 100 when every task is done', () => {
    const tasks = [{ status: 'SUBMITTED' }, { status: 'APPROVED' }];
    expect(rollUpTaskCounts(tasks).pct).toBe(100);
  });
});
