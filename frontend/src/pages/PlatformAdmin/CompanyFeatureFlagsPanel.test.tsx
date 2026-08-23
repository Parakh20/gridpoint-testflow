import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyFeatureFlagsPanel } from './CompanyFeatureFlagsPanel';

vi.mock('./platformFetch', () => ({
  platformFetch: vi.fn().mockResolvedValue({
    features: { ai_reports: false },
    flag_keys: ['ai_reports', 'bulk_invite'],
  }),
}));

describe('CompanyFeatureFlagsPanel', () => {
  it('treats an absent flag as enabled and an explicit false as off', async () => {
    render(<CompanyFeatureFlagsPanel companyId="co1" />);
    const aiReports = await screen.findByRole('switch', { name: /ai reports/i });
    const bulkInvite = screen.getByRole('switch', { name: /bulk invite/i });
    expect(aiReports).toHaveAttribute('data-state', 'unchecked');
    // Not present in the JSONB at all — defaults open.
    expect(bulkInvite).toHaveAttribute('data-state', 'checked');
    expect(screen.getByText(/default \(enabled\)/i)).toBeInTheDocument();
  });
});
