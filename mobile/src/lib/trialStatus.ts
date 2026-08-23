/**
 * Pure derivation of the billing/trial banner state.
 *
 * Mirrors the branching in frontend/src/components/TrialBanner.tsx, pulled out
 * of the component here so it can be unit-tested without a renderer — the same
 * treatment lib/taskProgress.ts got for the task-progress rules.
 */

import type { SubscriptionStatus } from '@testflow/shared';

export type BannerSeverity = 'warning' | 'urgent';

export interface TrialBannerState {
  severity: BannerSeverity;
  message: string;
}

export interface TrialBannerInput {
  /** subscriptions.status for the company, or null when no row exists yet. */
  subscriptionStatus: SubscriptionStatus | null;
  /** companies.trial_ends_at, or null when the company is not on a trial. */
  trialEndsAt: string | null;
  now: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Statuses that mean the tenant is no longer in good standing. */
const DEGRADED: ReadonlySet<SubscriptionStatus> = new Set([
  'past_due',
  'paused',
  'expired',
  'cancelled',
]);

/** Show the trial countdown only once it is close enough to matter. */
const COUNTDOWN_WINDOW_DAYS = 7;
const COUNTDOWN_URGENT_DAYS = 3;

export function trialBannerState({
  subscriptionStatus,
  trialEndsAt,
  now,
}: TrialBannerInput): TrialBannerState | null {
  // A paying customer in good standing never sees a banner.
  if (subscriptionStatus === 'active') return null;

  if (subscriptionStatus && DEGRADED.has(subscriptionStatus)) {
    return {
      severity: 'urgent',
      message: `Subscription ${subscriptionStatus.replace('_', ' ')} — some features may be limited. Contact your administrator.`,
    };
  }

  if (!trialEndsAt) return null;

  const endsAt = new Date(trialEndsAt);
  if (Number.isNaN(endsAt.getTime())) return null;

  const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / MS_PER_DAY);

  if (daysLeft <= 0) {
    return {
      severity: 'urgent',
      message: 'Trial has ended. Contact your administrator to continue using TestFlow.',
    };
  }
  if (daysLeft <= COUNTDOWN_WINDOW_DAYS) {
    return {
      severity: daysLeft <= COUNTDOWN_URGENT_DAYS ? 'urgent' : 'warning',
      message: `Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
    };
  }

  return null;
}
