import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlanComparisonCard } from '@/components/PlanComparisonCard';

const plans = [
  {
    id: 'p1', slug: 'starter', name: 'Starter', description: null,
    monthly_price_inr: 24999, annual_price_inr: 249999,
    max_users: 10, max_active_projects: 3, is_custom: false,
  },
  {
    id: 'p2', slug: 'enterprise', name: 'Enterprise', description: null,
    monthly_price_inr: null, annual_price_inr: null,
    max_users: null, max_active_projects: null, is_custom: true,
  },
];

const features = [
  { plan_id: 'p1', feature_key: 'offline_mobile', enabled: true },
  { plan_id: 'p1', feature_key: 'custom_domain', enabled: false },
  { plan_id: 'p2', feature_key: 'offline_mobile', enabled: true },
  { plan_id: 'p2', feature_key: 'custom_domain', enabled: true },
];

let featuresFail = false;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'plan_features') {
        return {
          select: () => Promise.resolve(
            featuresFail ? { data: null, error: { message: 'boom' } } : { data: features, error: null },
          ),
        };
      }
      const result = Promise.resolve({ data: plans, error: null });
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => result,
      };
      return builder;
    },
  },
}));

function renderCard(currentPlanSlug?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlanComparisonCard currentPlanSlug={currentPlanSlug} />
    </QueryClientProvider>,
  );
}

describe('PlanComparisonCard', () => {
  beforeEach(() => {
    featuresFail = false;
  });

  test('shows both monthly and annual prices for a priced plan', async () => {
    renderCard();
    expect(await screen.findByText('₹24,999/mo')).toBeInTheDocument();
    expect(screen.getByText('₹2,49,999/yr')).toBeInTheDocument();
  });

  test('renders a custom plan as Custom rather than a blank cell', async () => {
    renderCard();
    await screen.findByText('₹24,999/mo');
    expect(screen.getAllByText('Custom').length).toBeGreaterThanOrEqual(2);
  });

  test('renders null caps as Unlimited', async () => {
    renderCard();
    await screen.findByText('₹24,999/mo');
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThanOrEqual(2);
  });

  test('labels custom_domain rather than showing the raw key', async () => {
    renderCard();
    expect(await screen.findByText('Custom domain')).toBeInTheDocument();
    expect(screen.queryByText('custom_domain')).not.toBeInTheDocument();
  });

  test('marks the current plan', async () => {
    renderCard('starter');
    expect(await screen.findByText('Current')).toBeInTheDocument();
  });

  test('marks included and excluded features distinctly', async () => {
    renderCard();
    await screen.findByText('Custom domain');
    expect(screen.getAllByLabelText('Included').length).toBe(3);
    expect(screen.getAllByLabelText('Not included').length).toBe(1);
  });

  test('still renders prices when the features query fails', async () => {
    featuresFail = true;
    renderCard();
    expect(await screen.findByText('₹24,999/mo')).toBeInTheDocument();
    expect(screen.queryByText('Custom domain')).not.toBeInTheDocument();
  });
});
