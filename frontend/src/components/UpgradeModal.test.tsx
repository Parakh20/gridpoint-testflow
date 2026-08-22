import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UpgradeModal } from './UpgradeModal';
import type { UpgradeReason } from '@testflow/shared';

const PLANS_BY_SLUG: Record<string, { slug: string; name: string; monthly_price_inr: number | null; is_custom: boolean }> = {
  professional: { slug: 'professional', name: 'Professional', monthly_price_inr: 60000, is_custom: false },
  business: { slug: 'business', name: 'Business', monthly_price_inr: 150000, is_custom: false },
  enterprise: { slug: 'enterprise', name: 'Enterprise', monthly_price_inr: null, is_custom: true },
};

const invokeMock = vi.fn();
const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    from: () => ({
      select: () => ({
        eq: (_col: string, slug: string) => ({
          limit: () => Promise.resolve({
            data: PLANS_BY_SLUG[slug] ? [PLANS_BY_SLUG[slug]] : [],
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

  it('offers an in-place upgrade button for a non-custom required plan', async () => {
    // targetPlan query already mocked in this file's existing setup to
    // resolve { slug: 'business', name: 'Business', monthly_price_inr: 150000, is_custom: false }
    renderWithClient(<UpgradeModal reason={{ code: 'PLAN_LIMIT_REACHED', resource: 'users', current: 30, limit: 30, required_plan: 'business' }} onOpenChange={() => {}} onUpgraded={() => {}} />);
    expect(await screen.findByRole('button', { name: /upgrade now/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view plans/i })).not.toBeInTheDocument();
  });

  it('surfaces the real error message from a 502 payment failure', async () => {
    // Regression (I5): 500/502 responses from manage-subscription carry
    // `{ error }`, not `{ upgraded: false, reason }`. Reading only `reason`
    // collapsed every payment failure into a generic message.
    invokeMock.mockReset();
    toastMock.mockReset();
    const context = new Response(JSON.stringify({ error: 'Razorpay API error 400: card declined' }), { status: 502 });
    invokeMock.mockResolvedValueOnce({ data: null, error: new FunctionsHttpError(context) });

    renderWithClient(<UpgradeModal reason={{ code: 'PLAN_LIMIT_REACHED', resource: 'users', current: 30, limit: 30, required_plan: 'business' }} onOpenChange={() => {}} onUpgraded={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /upgrade now/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Upgrade failed',
          description: 'Razorpay API error 400: card declined',
          variant: 'destructive',
        }),
      );
    });
  });

  it('falls back to the pricing-page link when the required plan is custom (enterprise)', async () => {
    renderWithClient(<UpgradeModal reason={{ code: 'PLAN_LIMIT_REACHED', resource: 'users', current: 100, limit: 100, required_plan: 'enterprise' }} onOpenChange={() => {}} onUpgraded={() => {}} />);
    expect(await screen.findByRole('link', { name: /view plans/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade now/i })).not.toBeInTheDocument();
  });
});
