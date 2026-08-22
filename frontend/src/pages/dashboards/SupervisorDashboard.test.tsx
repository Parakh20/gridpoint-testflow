import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SupervisorDashboard from './SupervisorDashboard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'sup-1' }, userRole: 'SUPERVISOR', userName: 'Asha Nair', signOut: vi.fn() }),
}));

// SupervisorDashboard itself uses useRealtimeChannel/usePollingFallback directly
// (unlike EngineerDashboard) — mock the module so the component doesn't touch
// the real supabase channel/realtime wiring.
vi.mock('@/lib/realtime', () => ({
  useRealtimeChannel: () => {},
  usePollingFallback: () => {},
}));

// DashboardLayout renders NotificationBell unconditionally, and for the
// SUPERVISOR role NotificationBell issues its own supabase chain. A thenable
// chain object (every method returns the same chain, and the chain itself
// resolves via `then`) satisfies both that chain and SupervisorDashboard's
// own `.from().select().eq().order()` / `.from().select().in().eq().order()`
// chains, regardless of how many links are chained — see
// EngineerDashboard.test.tsx / DashboardLayout.test.tsx for the same pattern.
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
// verifying (MetricCard/EmptyState rendering on the supervisor dashboard).
vi.mock('@/components/TrialBanner', () => ({ TrialBanner: () => null }));
vi.mock('@/components/RealtimeStatusBanner', () => ({ RealtimeStatusBanner: () => null }));

function renderWithProviders() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <SupervisorDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe('SupervisorDashboard', () => {
  it('renders MetricCard stat tiles by their labels', async () => {
    selectMock.mockImplementation(() => emptyChain());
    renderWithProviders();
    await waitFor(() => {
      // "Assigned Projects" appears twice: once as the MetricCard tile label
      // and once as the CardTitle of the assigned-projects list section
      // below it — both are legitimate, so assert on the count rather than
      // a single unique match.
      expect(screen.getAllByText('Assigned Projects').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('Pending Start')).toBeInTheDocument();
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
    });
  });

  it('renders the EmptyState empty-assigned-projects message', async () => {
    selectMock.mockImplementation(() => emptyChain());
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('No projects assigned yet')).toBeInTheDocument();
    });
  });
});
