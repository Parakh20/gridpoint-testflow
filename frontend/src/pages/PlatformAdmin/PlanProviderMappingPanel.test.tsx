import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanProviderMappingPanel } from './PlanProviderMappingPanel';
import { AdminPlan } from './planTypes';

vi.mock('./platformFetch', () => ({ platformFetch: vi.fn().mockResolvedValue({}) }));

const basePlan = (overrides: Partial<AdminPlan> = {}): AdminPlan => ({
  id: 'p1',
  slug: 'starter',
  name: 'Starter',
  description: null,
  monthly_price_inr: 24999,
  annual_price_inr: 249999,
  max_users: 10,
  max_active_projects: 3,
  is_custom: false,
  is_active: true,
  is_public: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  features: [],
  provider_mapping: {
    plan_id: 'p1',
    razorpay_plan_id_monthly: 'plan_abc',
    razorpay_plan_id_annual: 'plan_def',
    monthly_price_inr_at_mapping: 24999,
    annual_price_inr_at_mapping: 249999,
    provider_mode: 'test',
    updated_at: '2026-01-01',
  },
  subscription_count: 2,
  billable_subscription_count: 1,
  price_drift: { monthly: false, annual: false },
  mode_mismatch: false,
  ...overrides,
});

describe('PlanProviderMappingPanel', () => {
  it('warns that the advertised price is not what Razorpay charges when prices drift', () => {
    render(
      <PlanProviderMappingPanel
        plan={basePlan({
          monthly_price_inr: 29999,
          price_drift: { monthly: true, annual: false },
        })}
        providerMode="test"
        providerConfigured
        onChanged={vi.fn()}
      />
    );
    expect(screen.getByText(/does not match what Razorpay charges/i)).toBeInTheDocument();
  });

  it('stays quiet when the mapped price matches the plan price', () => {
    render(
      <PlanProviderMappingPanel plan={basePlan()} providerMode="test" providerConfigured onChanged={vi.fn()} />
    );
    expect(screen.queryByText(/does not match what Razorpay charges/i)).not.toBeInTheDocument();
  });

  it('flags a test-mode mapping while the configured key is live', () => {
    render(
      <PlanProviderMappingPanel
        plan={basePlan({ mode_mismatch: true })}
        providerMode="live"
        providerConfigured
        onChanged={vi.fn()}
      />
    );
    expect(screen.getByText(/but the configured key is live/i)).toBeInTheDocument();
  });

  it('disables provider plan creation when Razorpay keys are not configured', () => {
    render(
      <PlanProviderMappingPanel plan={basePlan()} providerMode={null} providerConfigured={false} onChanged={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /create razorpay plans/i })).toBeDisabled();
  });

  it('renders no mapping controls for a custom, quote-only plan', () => {
    render(
      <PlanProviderMappingPanel
        plan={basePlan({ is_custom: true, provider_mapping: null })}
        providerMode="test"
        providerConfigured
        onChanged={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /create razorpay plans/i })).not.toBeInTheDocument();
    expect(screen.getByText(/sales-assisted/i)).toBeInTheDocument();
  });
});
