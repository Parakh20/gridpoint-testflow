import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubscriptionActions } from './SubscriptionActions';

const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

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
