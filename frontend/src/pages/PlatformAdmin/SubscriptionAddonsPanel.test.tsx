import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionAddonsPanel } from './SubscriptionAddonsPanel';

vi.mock('./platformFetch', () => ({ platformFetch: vi.fn().mockResolvedValue({}) }));

describe('SubscriptionAddonsPanel', () => {
  it('renders each add-on row with a Cancel button for active add-ons', () => {
    render(
      <SubscriptionAddonsPanel
        companyId="co1"
        addons={[{ id: 'a1', subscription_id: 's1', addon_key: 'extra_users', quantity: 15, unit_price_inr: null, status: 'active', created_at: '2026-01-01' }]}
        onChanged={vi.fn()}
      />
    );
    expect(screen.getByText('extra_users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('omits the Cancel button for already-cancelled add-ons', () => {
    render(
      <SubscriptionAddonsPanel
        companyId="co1"
        addons={[{ id: 'a1', subscription_id: 's1', addon_key: 'extra_users', quantity: 15, unit_price_inr: null, status: 'cancelled', created_at: '2026-01-01' }]}
        onChanged={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no add-ons', () => {
    render(<SubscriptionAddonsPanel companyId="co1" addons={[]} onChanged={vi.fn()} />);
    expect(screen.getByText('No add-ons yet')).toBeInTheDocument();
  });
});
