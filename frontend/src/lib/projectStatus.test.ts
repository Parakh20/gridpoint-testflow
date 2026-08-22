import { describe, it, expect } from 'vitest';
import { isOverdue } from './projectStatus';

describe('isOverdue', () => {
  it('returns true when end_date is in the past and status is not CLOSED', () => {
    expect(isOverdue('2020-01-01', 'ACTIVE')).toBe(true);
  });

  it('returns false when end_date is in the past but status is CLOSED', () => {
    expect(isOverdue('2020-01-01', 'CLOSED')).toBe(false);
  });

  it('returns false when end_date is in the future', () => {
    expect(isOverdue('2099-01-01', 'ACTIVE')).toBe(false);
  });

  it('returns false when end_date is null', () => {
    expect(isOverdue(null, 'ACTIVE')).toBe(false);
  });

  it('returns false when end_date is undefined', () => {
    expect(isOverdue(undefined, 'ACTIVE')).toBe(false);
  });
});
