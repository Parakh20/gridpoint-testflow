import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RenewPlanCard } from '@/components/RenewPlanCard';
import type { PlanOption } from '@/lib/planOptions';

const plans: PlanOption[] = [
  { slug: 'starter', name: 'Starter', monthlyPriceInr: 24999, annualPriceInr: 249999 },
  { slug: 'business', name: 'Business', monthlyPriceInr: 149999, annualPriceInr: 1499999 },
];

const invoke = vi.fn();
let opened = false;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock('@/lib/razorpayCheckout', () => ({
  loadRazorpayCheckout: () => {
    (window as unknown as { Razorpay: unknown }).Razorpay = class { open() { opened = true; } };
    return Promise.resolve();
  },
}));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/monitoring', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/functionsError', () => ({ parseFunctionsErrorBody: async () => ({ error: 'boom' }) }));

function renderCard(overrides: Partial<React.ComponentProps<typeof RenewPlanCard>> = {}) {
  return render(
    <RenewPlanCard
      planOptions={plans}
      currentPlanSlug="starter"
      currentInterval="monthly"
      periodEnd="2026-09-27T00:00:00Z"
      isFrozen={false}
      companyName="SLPL Power"
      userEmail="admin@example.com"
      onRenewed={() => {}}
      {...overrides}
    />,
  );
}

describe('RenewPlanCard', () => {
  beforeEach(() => {
    invoke.mockReset();
    toast.mockReset();
    opened = false;
    delete (window as unknown as { Razorpay?: unknown }).Razorpay;
  });

  test('preselects the current plan so renewing as-is is one click', () => {
    renderCard();
    expect(screen.getByLabelText('Plan')).toHaveValue('starter');
    expect(screen.getByRole('button', { name: 'Renew' })).toBeInTheDocument();
  });

  test('shows the paid-through date and that early renewal loses no days', () => {
    renderCard();
    expect(screen.getByText(/Paid through/)).toBeInTheDocument();
    expect(screen.getByText(/never lost/)).toBeInTheDocument();
  });

  test('sends plan and interval but never a price', async () => {
    invoke.mockResolvedValue({
      data: { order_id: 'order_1', razorpay_key_id: 'k', plan_name: 'Starter', billing_interval: 'monthly' },
      error: null,
    });
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: 'Renew' }));

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const [, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(opts.body).toEqual({
      action: 'renew_plan', target_plan_slug: 'starter', billing_interval: 'monthly',
    });
    expect(opts.body).not.toHaveProperty('amount_inr');
    await waitFor(() => expect(opened).toBe(true));
  });

  test('switching plan relabels the action, since renewal is how a plan changes', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.selectOptions(screen.getByLabelText('Plan'), 'business');
    expect(screen.getByRole('button', { name: 'Switch plan' })).toBeInTheDocument();
    expect(screen.getByText(/applies from the moment the payment clears/)).toBeInTheDocument();
  });

  test('a frozen workspace is told renewal restores it', () => {
    renderCard({ isFrozen: true });
    expect(screen.getByText('Renew to unfreeze')).toBeInTheDocument();
    expect(screen.getByText(/read-only/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renew now' })).toBeInTheDocument();
  });

  test('a company that never paid is asked to choose a plan, not to renew', () => {
    renderCard({ periodEnd: null, currentPlanSlug: undefined });
    expect(screen.getByText('Choose a plan')).toBeInTheDocument();
    expect(screen.getByText(/nothing is ever charged automatically/)).toBeInTheDocument();
  });

  test('annual advertises the saving over twelve monthly payments', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.selectOptions(screen.getByLabelText('Period'), 'annual');
    expect(screen.getByRole('option', { name: /save 17%/ })).toBeInTheDocument();
  });

  test('surfaces a checkout failure instead of failing silently', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'nope' } });
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', { name: 'Renew' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(opened).toBe(false);
  });
});
