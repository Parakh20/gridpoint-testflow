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
});
