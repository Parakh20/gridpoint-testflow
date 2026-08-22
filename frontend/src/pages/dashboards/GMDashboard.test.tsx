import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GMDashboard from './GMDashboard';

const mockUseAuth = vi.fn();
const mockUseCompany = vi.fn();
const mockUseTheme = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/contexts/CompanyContext', () => ({ useCompany: () => mockUseCompany() }));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => mockUseTheme() }));

vi.mock('@/lib/realtime', () => ({
  useRealtimeChannel: () => {},
  usePollingFallback: () => {},
  useRealtimeStatus: () => ({ connected: true }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

function setup() {
  mockUseAuth.mockReturnValue({
    user: { id: 'test-user' },
    userRole: 'GM',
    loading: false,
    companyMismatch: false,
  });
  mockUseCompany.mockReturnValue({
    companyId: 'test-company',
    companyName: 'Test Company',
  });
  mockUseTheme.mockReturnValue({
    theme: 'light',
    toggleTheme: vi.fn(),
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GMDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('GMDashboard', () => {
  it('renders the stat row as MetricCards with expected labels', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Total Projects')).toBeInTheDocument());
    // Verify MetricCards are rendered by checking for bg-surface-elevated class
    const metricCards = document.querySelectorAll('.bg-surface-elevated');
    expect(metricCards.length).toBeGreaterThanOrEqual(5); // At least 5 stat cards
    // Verify all expected labels are present in the MetricCards
    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    // Check for Assigned and Unassigned in MetricCard labels specifically
    const assignedMetricCards = Array.from(metricCards).filter(card =>
      card.textContent?.includes('Assigned')
    );
    expect(assignedMetricCards.length).toBeGreaterThan(0);
    const unassignedMetricCards = Array.from(metricCards).filter(card =>
      card.textContent?.includes('Unassigned')
    );
    expect(unassignedMetricCards.length).toBeGreaterThan(0);
  });

  it('renders the shared EmptyState with a create-project action when there are no projects', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('No projects yet')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Create Your First Test Plan/i })).toBeInTheDocument();
  });

  it('surfaces an overdue project in the Needs Attention panel', async () => {
    const overdueProject = {
      id: 'p1', project_number: 'TF-9001', site_name: 'Substation Z', status: 'ACTIVE',
      end_date: '2020-01-01', assigned_to: 'sup-1', created_at: '2026-01-01',
      site_address: '', client: null, start_date: null,
    };
    // Re-mock supabase for this test only — override the module-level mock's return value.
    // Must handle both the `projects` chain (.select().order()) and the
    // `profiles` chain (.select().in()) that fetchAllProjects issues for
    // assigned_to lookups, or the second call throws (`.in` is not a function).
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.from as any) = vi.fn(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: [overdueProject], error: null }),
        in: () => Promise.resolve({ data: [], error: null }),
      }),
    }));

    setup();
    await waitFor(() => expect(screen.getByText('Needs Attention')).toBeInTheDocument());
    // The overdue project renders both in the Needs Attention panel and in the
    // main project list below it, so assert presence rather than a single match.
    expect(screen.getAllByText('TF-9001').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/overdue/i).length).toBeGreaterThan(0);
  });
});
