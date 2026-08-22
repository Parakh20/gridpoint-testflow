import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubscriptionDetailDrawer } from './SubscriptionDetailDrawer';

// SubscriptionDetailDrawer imports the Supabase client transitively via
// useToast/platformFetch's sibling modules — mock it the same way
// SalesTab.test.tsx does, so import-time createClient() doesn't throw
// without a real VITE_SUPABASE_URL.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

// Mock platformFetch to return different shapes based on the action argument,
// mirroring the drawer's load() Promise.all([get_subscription_detail,
// get_billing_extras]) call. Track call count so tests can assert the
// drawer's own refetch (load()) actually re-ran.
const platformFetchMock = vi.fn((action: string, _payload?: unknown) => {
  if (action === 'get_subscription_detail') {
    return Promise.resolve({
      subscription: {
        id: 's1',
        company_id: 'co1',
        status: 'active',
        billing_interval: 'monthly',
        current_period_end: null,
        seat_count: 5,
        discount_pct: null,
        credit_balance_inr: 0,
        companies: { name: 'Acme Corp', slug: 'acme', is_active: true },
        plans: { slug: 'business', name: 'Business', monthly_price_inr: 10000, annual_price_inr: null, max_users: 50, max_active_projects: 20 },
      },
      audit_log: [],
    });
  }
  if (action === 'get_billing_extras') {
    return Promise.resolve({
      contract: null,
      addons: [{ id: 'a1', subscription_id: 's1', addon_key: 'extra_users', quantity: 10, unit_price_inr: null, status: 'active', created_at: '2026-01-01' }],
    });
  }
  // admin_create_enterprise_contract and other mutation actions.
  return Promise.resolve(null);
});

vi.mock('./platformFetch', () => ({
  platformFetch: (action: string, payload: unknown) => platformFetchMock(action, payload),
}));

describe('SubscriptionDetailDrawer', () => {
  it('renders both the enterprise contract and add-ons panels once get_billing_extras resolves', async () => {
    render(<SubscriptionDetailDrawer companyId="co1" open onOpenChange={vi.fn()} onChanged={vi.fn()} />);

    // EnterpriseContractsPanel: contract is null → create-contract form.
    expect(await screen.findByRole('button', { name: /create contract/i })).toBeInTheDocument();

    // SubscriptionAddonsPanel: one active add-on row from get_billing_extras.
    expect(await screen.findByText('extra_users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('refreshes both the parent onChanged and its own local state when EnterpriseContractsPanel reports a change', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<SubscriptionDetailDrawer companyId="co1" open onOpenChange={vi.fn()} onChanged={onChanged} />);

    await screen.findByRole('button', { name: /create contract/i });
    const callsBeforeSubmit = platformFetchMock.mock.calls.filter(
      ([action]) => action === 'get_subscription_detail' || action === 'get_billing_extras'
    ).length;

    // The submit button is disabled on a fully-blank form (guard against
    // silently creating an unlimited-entitlement contract) — fill one field
    // so the click actually submits.
    await user.type(screen.getByLabelText(/sla level/i), 'gold');
    await user.click(screen.getByRole('button', { name: /create contract/i }));

    // Parent's onChanged prop must fire (drives BillingTab's MRR/ARR + list refresh).
    expect(onChanged).toHaveBeenCalledTimes(1);

    // Drawer's own load() must also re-run (drives the drawer's local panels).
    const callsAfterSubmit = platformFetchMock.mock.calls.filter(
      ([action]) => action === 'get_subscription_detail' || action === 'get_billing_extras'
    ).length;
    expect(callsAfterSubmit).toBeGreaterThan(callsBeforeSubmit);
  });
});
