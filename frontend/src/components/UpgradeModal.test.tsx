import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UpgradeModal } from './UpgradeModal';
import type { UpgradeReason } from '@testflow/shared';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => Promise.resolve({
            data: [{ slug: 'professional', name: 'Professional', monthly_price_inr: 60000 }],
            error: null,
          }),
        }),
      }),
    }),
  },
}));

const renderWithClient = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('UpgradeModal', () => {
  it('shows the blocked resource and the plan that would unblock it', async () => {
    const reason: UpgradeReason = {
      code: 'PLAN_LIMIT_REACHED',
      resource: 'projects',
      current: 3,
      limit: 3,
      required_plan: 'professional',
    };
    renderWithClient(<UpgradeModal reason={reason} onOpenChange={() => {}} />);
    expect(await screen.findByText(/3 active projects/i)).toBeInTheDocument();
    expect(await screen.findByText(/Professional/i)).toBeInTheDocument();
  });

  it('renders without a suggested plan when required_plan is null (e.g. past-due grace expired)', async () => {
    // QA-matrix scenario 5: once is_past_due_grace_expired() trips,
    // get_resource_limit_status() returns required_plan: null (see the
    // 20260814000001 migration fix and docs/dev/BILLING_QA_MATRIX.md scenario 5)
    // because upgrading plans doesn't fix an unpaid invoice. The modal must
    // degrade gracefully instead of crashing or showing a bogus "Upgrade to null".
    const reason: UpgradeReason = {
      code: 'PLAN_LIMIT_REACHED',
      resource: 'users',
      current: 8,
      limit: 10,
      required_plan: null,
    };
    renderWithClient(<UpgradeModal reason={reason} onOpenChange={() => {}} />);
    expect(await screen.findByText(/10 active users/i)).toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to/i)).not.toBeInTheDocument();
  });
});
