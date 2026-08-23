import { describe, it, expect } from '@jest/globals';
import { trialBannerState } from './trialStatus';

const NOW = new Date('2026-08-23T12:00:00.000Z');

/** ISO timestamp `days` days after NOW. */
function inDays(days: number): string {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('trialBannerState', () => {
  it('shows nothing for an active subscription, even mid-trial', () => {
    // Arrange
    const input = { subscriptionStatus: 'active' as const, trialEndsAt: inDays(1), now: NOW };

    // Act
    const state = trialBannerState(input);

    // Assert
    expect(state).toBeNull();
  });

  it('shows an urgent banner for a past_due subscription', () => {
    const state = trialBannerState({
      subscriptionStatus: 'past_due',
      trialEndsAt: null,
      now: NOW,
    });

    expect(state?.severity).toBe('urgent');
    expect(state?.message).toContain('past due');
  });

  it.each(['paused', 'expired', 'cancelled'] as const)(
    'treats %s as degraded standing',
    (status) => {
      expect(trialBannerState({ subscriptionStatus: status, trialEndsAt: null, now: NOW })?.severity).toBe('urgent');
    },
  );

  it('shows nothing when a trial has more than 7 days left', () => {
    expect(trialBannerState({ subscriptionStatus: 'trialing', trialEndsAt: inDays(10), now: NOW })).toBeNull();
  });

  it('warns (not urgent) between 4 and 7 days left', () => {
    const state = trialBannerState({ subscriptionStatus: 'trialing', trialEndsAt: inDays(5), now: NOW });

    expect(state?.severity).toBe('warning');
    expect(state?.message).toBe('Trial ends in 5 days.');
  });

  it('escalates to urgent at 3 days or fewer', () => {
    expect(trialBannerState({ subscriptionStatus: 'trialing', trialEndsAt: inDays(3), now: NOW })?.severity).toBe('urgent');
  });

  it('singularizes the countdown at one day', () => {
    expect(trialBannerState({ subscriptionStatus: 'trialing', trialEndsAt: inDays(1), now: NOW })?.message).toBe(
      'Trial ends in 1 day.',
    );
  });

  it('reports an ended trial once the deadline has passed', () => {
    const state = trialBannerState({ subscriptionStatus: 'trialing', trialEndsAt: inDays(-1), now: NOW });

    expect(state?.severity).toBe('urgent');
    expect(state?.message).toContain('Trial has ended');
  });

  it('shows nothing when there is neither a subscription nor a trial end', () => {
    expect(trialBannerState({ subscriptionStatus: null, trialEndsAt: null, now: NOW })).toBeNull();
  });

  it('ignores an unparseable trial_ends_at rather than rendering NaN', () => {
    expect(trialBannerState({ subscriptionStatus: null, trialEndsAt: 'not-a-date', now: NOW })).toBeNull();
  });
});
