import { describe, it, expect } from 'vitest';
import { sortPendingReviewsByProject } from '@testflow/shared';

type Row = { id: string; projectId: string };

describe('sortPendingReviewsByProject', () => {
  it('groups rows by projectId in first-seen project order', () => {
    const rows: Row[] = [
      { id: 'a', projectId: 'p2' },
      { id: 'b', projectId: 'p1' },
      { id: 'c', projectId: 'p2' },
      { id: 'd', projectId: 'p1' },
    ];
    const sorted = sortPendingReviewsByProject(rows);
    expect(sorted.map((r) => r.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('preserves original row order within a project (stable)', () => {
    const rows: Row[] = [
      { id: 'x', projectId: 'p1' },
      { id: 'y', projectId: 'p1' },
      { id: 'z', projectId: 'p1' },
    ];
    expect(sortPendingReviewsByProject(rows).map((r) => r.id)).toEqual(['x', 'y', 'z']);
  });

  it('returns an empty array unchanged', () => {
    expect(sortPendingReviewsByProject([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const rows: Row[] = [{ id: 'a', projectId: 'p2' }, { id: 'b', projectId: 'p1' }];
    const original = [...rows];
    sortPendingReviewsByProject(rows);
    expect(rows).toEqual(original);
  });
});
