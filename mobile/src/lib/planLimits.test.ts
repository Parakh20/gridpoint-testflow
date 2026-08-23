import { describe, it, expect } from '@jest/globals';
import { isPlanGateRlsError, planLimitMessage } from './planLimits';

describe('planLimitMessage', () => {
  it('reports usage against the limit when both are known', () => {
    // Arrange
    const status = { allowed: false, current: 5, limit: 5, required_plan: 'business' as const };

    // Act
    const message = planLimitMessage(status);

    // Assert
    expect(message).toBe(
      'Active project limit reached (5 of 5 used). Ask your administrator to upgrade to the business plan.',
    );
  });

  it('reports only the limit when the current count is unknown', () => {
    expect(planLimitMessage({ limit: 3, current: null, required_plan: null })).toBe(
      'Active project limit reached (plan allows 3). Ask your administrator to upgrade the plan.',
    );
  });

  it('stays generic rather than inventing a number when nothing is known', () => {
    expect(planLimitMessage(null)).toBe(
      'Active project limit reached. Ask your administrator to upgrade the plan.',
    );
  });
});

describe('isPlanGateRlsError', () => {
  it('matches the PostgREST row-level security rejection', () => {
    expect(
      isPlanGateRlsError({ message: 'new row violates row-level security policy for table "projects"' }),
    ).toBe(true);
  });

  it('does not match an unrelated error', () => {
    expect(isPlanGateRlsError({ message: 'duplicate key value violates unique constraint' })).toBe(false);
  });

  it('tolerates a non-error value', () => {
    expect(isPlanGateRlsError(null)).toBe(false);
  });
});
