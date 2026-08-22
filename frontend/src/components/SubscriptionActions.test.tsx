import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SubscriptionActions } from './SubscriptionActions';

const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));
const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));

beforeEach(() => {
  invokeMock.mockReset();
  toastMock.mockReset();
});

describe('SubscriptionActions', () => {
  it('shows blockers when a downgrade is infeasible', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { scheduled: false, blockers: [{ resource: 'users', current: 15, target_limit: 10 }] },
      error: null,
    });

    render(
      <SubscriptionActions
        currentPlanName="Business"
        planOptions={[{ slug: 'starter', name: 'Starter' }]}
        onChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /change plan/i }));
    fireEvent.change(screen.getByLabelText(/new plan/i), { target: { value: 'starter' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm downgrade/i }));

    await waitFor(() => {
      expect(screen.getByText(/reduce/i)).toBeInTheDocument();
      expect(screen.getByText(/15/)).toBeInTheDocument();
      expect(screen.getByText(/10/)).toBeInTheDocument();
    });
  });

  it('shows blockers when manage-subscription rejects with the real 409 FunctionsHttpError shape', async () => {
    // Regression test: supabase-js throws FunctionsHttpError for ANY
    // non-2xx response (manage-subscription returns 409 for a blocked
    // downgrade) — data is null and the JSON body lives on error.context.
    const body = { scheduled: false, blockers: [{ resource: 'users', current: 15, target_limit: 10 }] };
    const context = new Response(JSON.stringify(body), { status: 409 });
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: new FunctionsHttpError(context),
    });

    render(
      <SubscriptionActions
        currentPlanName="Business"
        planOptions={[{ slug: 'starter', name: 'Starter' }]}
        onChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /change plan/i }));
    fireEvent.change(screen.getByLabelText(/new plan/i), { target: { value: 'starter' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm downgrade/i }));

    await waitFor(() => {
      expect(screen.getByText(/reduce/i)).toBeInTheDocument();
      expect(screen.getByText(/15/)).toBeInTheDocument();
      expect(screen.getByText(/10/)).toBeInTheDocument();
    });
  });

  it('blocks a Business -> Professional downgrade when active users exceed the target plan cap (real plan numbers)', async () => {
    // Regression/QA-matrix scenario 4: Business allows up to 100 users,
    // Professional caps at 30 (see supabase/migrations/20260812000001_plans_and_plan_features.sql).
    // A company sitting at 31 active users must be blocked from downgrading
    // to Professional until they drop to <= 30. This mirrors exactly what
    // check_plan_downgrade_feasibility() computes server-side (see
    // docs/dev/BILLING_QA_MATRIX.md scenario 4 for the hand-traced SQL trace):
    // current_users(31) > target_max_users(30) => blocker recorded.
    invokeMock.mockResolvedValueOnce({
      data: {
        scheduled: false,
        blockers: [{ resource: 'users', current: 31, target_limit: 30 }],
      },
      error: null,
    });

    render(
      <SubscriptionActions
        currentPlanName="Business"
        planOptions={[{ slug: 'professional', name: 'Professional' }]}
        onChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /change plan/i }));
    fireEvent.change(screen.getByLabelText(/new plan/i), { target: { value: 'professional' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm downgrade/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('manage-subscription', {
        body: { action: 'downgrade', target_plan_slug: 'professional' },
      });
      expect(screen.getByText(/reduce/i)).toBeInTheDocument();
      expect(screen.getByText(/31/)).toBeInTheDocument();
      expect(screen.getByText(/30/)).toBeInTheDocument();
    });
  });

  it('calls the cancel action and shows confirmation', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { cancelled_at_period_end: true, cancel_at: '2026-09-01T00:00:00Z' },
      error: null,
    });

    render(
      <SubscriptionActions currentPlanName="Business" planOptions={[]} onChanged={() => {}} />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel subscription/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('manage-subscription', {
        body: { action: 'cancel' },
      });
    });
  });
});

describe('SubscriptionActions upgrade', () => {
  it('calls the upgrade action and shows a confirmation toast on success', async () => {
    invokeMock.mockResolvedValueOnce({ data: { upgraded: true, plan_slug: 'business' }, error: null });

    render(
      <SubscriptionActions
        currentPlanName="Professional"
        planOptions={[]}
        upgradeOptions={[{ slug: 'business', name: 'Business' }]}
        onChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /upgrade plan/i }));
    fireEvent.change(screen.getByLabelText(/new plan/i, { selector: '#upgrade-target-plan' }), { target: { value: 'business' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm upgrade/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('manage-subscription', {
        body: { action: 'upgrade', target_plan_slug: 'business' },
      });
    });
  });

  it('shows the eligibility-blocked reason from a 409 response', async () => {
    const body = { upgraded: false, reason: 'Your company is on a custom enterprise contract — contact your account manager to change plans' };
    const context = new Response(JSON.stringify(body), { status: 409 });
    invokeMock.mockResolvedValueOnce({ data: null, error: new FunctionsHttpError(context) });

    render(
      <SubscriptionActions
        currentPlanName="Professional"
        planOptions={[]}
        upgradeOptions={[{ slug: 'business', name: 'Business' }]}
        onChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /upgrade plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm upgrade/i }));

    await waitFor(() => {
      expect(screen.getByText(/enterprise contract/i)).toBeInTheDocument();
    });
  });

  it('surfaces the real error message in a destructive toast for a 502 payment failure', async () => {
    // Regression (I5): 500/502 responses from manage-subscription use the
    // `{ error }` shape, not `{ upgraded: false, reason }`. Reading only
    // `reason` rendered a bland inline note and skipped captureException.
    const body = { error: 'Razorpay API error 400: card declined' };
    const context = new Response(JSON.stringify(body), { status: 502 });
    invokeMock.mockResolvedValueOnce({ data: null, error: new FunctionsHttpError(context) });

    render(
      <SubscriptionActions
        currentPlanName="Professional"
        planOptions={[]}
        upgradeOptions={[{ slug: 'business', name: 'Business' }]}
        onChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /upgrade plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm upgrade/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Upgrade failed',
          description: 'Razorpay API error 400: card declined',
          variant: 'destructive',
        }),
      );
    });
    // Must NOT fall into the inline "blocked reason" branch.
    expect(screen.queryByText(/card declined/i)).not.toBeInTheDocument();
  });

  it('enables Confirm Upgrade once asynchronously-loaded upgrade options arrive', async () => {
    // Regression (I6): the upgradeTargetSlug initializer only runs at mount,
    // before the async upgrade-options query resolves — leaving the select
    // unselected and Confirm disabled until the user manually re-picked.
    const { rerender } = render(
      <SubscriptionActions currentPlanName="Professional" planOptions={[]} upgradeOptions={[]} onChanged={() => {}} />
    );
    expect(screen.queryByRole('button', { name: /upgrade plan/i })).not.toBeInTheDocument();

    rerender(
      <SubscriptionActions
        currentPlanName="Professional"
        planOptions={[]}
        upgradeOptions={[{ slug: 'business', name: 'Business' }]}
        onChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /upgrade plan/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm upgrade/i })).toBeEnabled();
    });
  });

  it('omits the upgrade button when there are no eligible upgrade targets', () => {
    render(
      <SubscriptionActions currentPlanName="Enterprise" planOptions={[]} upgradeOptions={[]} onChanged={() => {}} />
    );
    expect(screen.queryByRole('button', { name: /upgrade plan/i })).not.toBeInTheDocument();
  });
});
