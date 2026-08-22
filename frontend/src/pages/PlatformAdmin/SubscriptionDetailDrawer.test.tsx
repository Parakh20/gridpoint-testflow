import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
// get_billing_extras]) call.
vi.mock('./platformFetch', () => ({
  platformFetch: (action: string) => {
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
    return Promise.resolve(null);
  },
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
});
