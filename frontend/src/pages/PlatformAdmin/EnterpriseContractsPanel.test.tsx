import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnterpriseContractsPanel } from './EnterpriseContractsPanel';

vi.mock('./platformFetch', () => ({ platformFetch: vi.fn().mockResolvedValue({ contract: { id: 'c1', custom_monthly_price_inr: 50000 } }) }));

describe('EnterpriseContractsPanel', () => {
  it('renders a create-contract form when no contract exists', () => {
    render(<EnterpriseContractsPanel companyId="co1" contract={null} onChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: /create contract/i })).toBeInTheDocument();
  });

  it('renders contract details in read-only mode when a contract exists', () => {
    render(
      <EnterpriseContractsPanel
        companyId="co1"
        contract={{
          id: 'c1',
          company_id: 'co1',
          custom_monthly_price_inr: 50000,
          custom_annual_price_inr: null,
          max_users: null,
          max_active_projects: null,
          max_storage_gb: null,
          contract_start: '2026-01-01',
          contract_end: null,
          sla_level: 'gold',
          support_level: null,
          custom_features: {},
        }}
        onChanged={vi.fn()}
      />
    );
    expect(screen.getByText(/gold/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create contract/i })).not.toBeInTheDocument();
  });
});
