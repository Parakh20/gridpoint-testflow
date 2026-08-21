import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ProjectDetail from './ProjectDetail';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userRole: 'GM', user: { id: 'u1' } }),
}));
vi.mock('@/lib/features', () => ({ useFeature: () => false }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
// DashboardLayout renders TrialBanner/RealtimeStatusBanner unconditionally.
// Both pull in CompanyContext/react-query/supabase/useRealtimeStatus, none
// of which this test wires up — this test targets ProjectDetail's own
// breadcrumbs/progress rendering, not those banners' own logic (which has
// its own coverage elsewhere), so stub them out. Same pattern as
// DashboardLayout.test.tsx.
vi.mock('@/components/TrialBanner', () => ({ TrialBanner: () => null }));
vi.mock('@/components/RealtimeStatusBanner', () => ({ RealtimeStatusBanner: () => null }));

const project = {
  id: 'p1',
  project_number: 'TF-1024',
  status: 'ACTIVE',
  site_name: 'Substation Alpha',
  site_address: '1 Grid Rd',
  client: 'Acme Power',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  created_at: '2026-01-01',
  assigned_to: null,
};

// NotificationBell (rendered unconditionally by DashboardLayout) opens a
// realtime channel via useRealtimeChannel regardless of role, so the mock
// needs `channel`/`removeChannel` alongside the per-table `from` stubs.
vi.mock('@/integrations/supabase/client', () => {
  const channelStub = {
    on: () => channelStub,
    subscribe: () => channelStub,
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'projects') {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: project, error: null }) }) }) };
        }
        if (table === 'equipment_instances') {
          return { select: () => ({ eq: () => Promise.resolve({ data: [{ id: 'e1' }], error: null }) }) };
        }
        if (table === 'test_tasks') {
          return {
            select: () => ({
              in: () => Promise.resolve({
                data: [{ status: 'APPROVED' }, { status: 'SUBMITTED' }, { status: 'IN_PROGRESS' }, { status: 'DRAFT' }],
                error: null,
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
      channel: () => channelStub,
      removeChannel: () => {},
    },
  };
});

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function setup() {
  const client = makeClient();
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/projects/p1']}>
          <Routes>
            <Route path="/projects/:id" element={<ProjectDetail />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('ProjectDetail', () => {
  it('renders breadcrumbs with the project number as the current page', async () => {
    setup();
    await waitFor(() => expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument());
    const crumbNav = screen.getByLabelText('Breadcrumb');
    expect(crumbNav).toHaveTextContent('Projects');
    expect(crumbNav).toHaveTextContent('TF-1024');
  });

  it('renders a MetricCard progress row once task stats load', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Approved')).toBeInTheDocument());
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Not Started')).toBeInTheDocument();
  });
});
