import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddonsCard } from '@/components/AddonsCard';

const catalog = [
  {
    addon_key: 'extra_users', name: 'Additional users', description: 'Raises your user limit.',
    unit_price_inr: 2499, kind: 'quantity', max_quantity: 100, sort_order: 1,
  },
  {
    addon_key: 'sso', name: 'SSO', description: 'Single sign-on.',
    unit_price_inr: 34999, kind: 'flag', max_quantity: 1, sort_order: 2,
  },
];

let activeAddons: Array<{ addon_key: string; quantity: number }> = [];

const invoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    from: (table: string) => {
      if (table === 'addon_catalog') {
        const result = Promise.resolve({ data: catalog, error: null });
        const b: Record<string, unknown> = {};
        b.select = () => b; b.eq = () => b; b.order = () => result;
        return b;
      }
      const result = Promise.resolve({ data: activeAddons, error: null });
      const b: Record<string, unknown> = {};
      b.select = () => b;
      let calls = 0;
      b.eq = () => (++calls >= 2 ? result : b);
      return b;
    },
  },
}));

vi.mock('@/lib/razorpayCheckout', () => ({
  loadRazorpayCheckout: () => {
    (window as unknown as { Razorpay: unknown }).Razorpay = class {
      open() { opened = true; }
    };
    return Promise.resolve();
  },
}));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/monitoring', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/functionsError', () => ({ parseFunctionsErrorBody: async () => ({ error: 'boom' }) }));

let opened = false;

function renderCard(hasSubscription = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AddonsCard
        companyId="c1"
        companyName="SLPL Power"
        userEmail="admin@example.com"
        hasSubscription={hasSubscription}
        onPurchased={() => {}}
      />
    </QueryClientProvider>,
  );
}

describe('AddonsCard', () => {
  beforeEach(() => {
    activeAddons = [];
    opened = false;
    invoke.mockReset();
    toast.mockReset();
    delete (window as unknown as { Razorpay?: unknown }).Razorpay;
  });

  test('prices a quantity add-on per unit and totals it on the button', async () => {
    renderCard();
    expect(await screen.findByText('Additional users')).toBeInTheDocument();
    expect(screen.getByText('₹2,499 each')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buy — ₹2,499/ })).toBeInTheDocument();
  });

  test('multiplies the total by the chosen quantity', async () => {
    const user = userEvent.setup();
    renderCard();
    const qty = await screen.findByLabelText('Quantity of Additional users');
    // clear() then type() is exactly the retype a real user performs; the
    // field must not snap back to 1 and turn "3" into "13".
    await user.clear(qty);
    await user.type(qty, '3');
    expect(qty).toHaveValue(3);
    expect(await screen.findByRole('button', { name: /Buy — ₹7,497/ })).toBeInTheDocument();
  });

  test('sends the addon key and quantity, never a price, to the server', async () => {
    invoke.mockResolvedValue({
      data: { order_id: 'order_1', razorpay_key_id: 'rzp_test', addon_name: 'SSO', quantity: 1 },
      error: null,
    });
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: /Buy — ₹34,999/ }));

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe('manage-subscription');
    expect(opts.body).toEqual({ action: 'purchase_addon', addon_key: 'sso', quantity: 1 });
    expect(opts.body).not.toHaveProperty('amount_inr');
    await waitFor(() => expect(opened).toBe(true));
  });

  test('disables buying while the company has no subscription', async () => {
    renderCard(false);
    expect(await screen.findByText(/Add-ons need an active subscription/)).toBeInTheDocument();
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });

  test('marks an owned flag add-on active and blocks re-purchase', async () => {
    activeAddons = [{ addon_key: 'sso', quantity: 1 }];
    renderCard();
    await screen.findByText('SSO');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Active' })).toBeDisabled(),
    );
    // The badge and the button both read "Active" — assert on the badge
    // specifically so this cannot pass on the button alone.
    expect(screen.getByText('Active', { selector: 'span' })).toBeInTheDocument();
  });

  test('surfaces a checkout failure as a toast instead of failing silently', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'nope' } });
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: /Buy — ₹34,999/ }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(opened).toBe(false);
  });
});
