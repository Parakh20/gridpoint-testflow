import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import EngineerDashboard from './EngineerDashboard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'eng-1' }, userRole: 'ENGINEER', userName: 'Priya Rao', signOut: vi.fn() }),
}));

// DashboardLayout renders NotificationBell unconditionally, and for the
// ENGINEER role NotificationBell issues its own supabase chain
// (equipment_instances -> projects -> test_tasks with .order()/.limit()).
// A thenable chain object (every method returns the same chain, and the
// chain itself resolves via `then`) satisfies both that chain and
// EngineerDashboard's own shorter .eq()/.in() terminal calls, regardless of
// how many links are chained — see DashboardLayout.test.tsx for the same
// pattern used for the same reason.
const selectMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => {
  const channel: Record<string, unknown> = {
    on: () => channel,
    subscribe: () => channel,
  };
  return {
    supabase: {
      from: (...args: unknown[]) => selectMock(...args),
      channel: () => channel,
      removeChannel: () => {},
    },
  };
});

function emptyChain() {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  return chain;
}

// DashboardLayout also renders TrialBanner/RealtimeStatusBanner
// unconditionally; both pull in CompanyContext/react-query/supabase plumbing
// this test doesn't wire up and that isn't relevant to what this test is
// verifying (MetricCard/EmptyState rendering on the engineer dashboard).
vi.mock('@/components/TrialBanner', () => ({ TrialBanner: () => null }));
vi.mock('@/components/RealtimeStatusBanner', () => ({ RealtimeStatusBanner: () => null }));

function renderWithProviders() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <EngineerDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe('EngineerDashboard', () => {
  it('renders MetricCard stat tiles by their labels', async () => {
    selectMock.mockImplementation(() => emptyChain());
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('Assigned Tests')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('renders the EmptyState empty-assignments message when there are no projects', async () => {
    selectMock.mockImplementation(() => emptyChain());
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('No assignments yet')).toBeInTheDocument();
    });
  });
});
