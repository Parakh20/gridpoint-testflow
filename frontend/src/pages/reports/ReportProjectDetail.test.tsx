import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ReportProjectDetail from './ReportProjectDetail';

const PROJECT_FIXTURE = {
  id: 'p1',
  project_number: 'TF-1001',
  site_name: 'Site A',
  status: 'CLOSED',
  assigned_to: null,
  client: null,
  site_address: null,
  start_date: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

// This page fetches through the shared `supabase` client directly (not a
// TanStack Query hook) — see the `.from('projects')...single()` call in
// ReportProjectDetail.tsx's fetchData effect. Mock table-by-table so the
// equipment_instances lookup can short-circuit to an empty result and skip
// straight to render, per the file's own early-return-on-empty branch.
// A chainable fallback stub also satisfies DashboardLayout's own
// unconditionally-rendered NotificationBell/TrialBanner/RealtimeStatusBanner
// Supabase calls (same pattern as DashboardLayout.test.tsx).
vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  const channel: Record<string, unknown> = {
    on: () => channel,
    subscribe: () => channel,
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'projects') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: PROJECT_FIXTURE, error: null }),
              }),
            }),
          };
        }
        return chain;
      },
      channel: () => channel,
      removeChannel: () => {},
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn(), user: { id: 'u1' }, userRole: 'GM', userName: 'Gita' }),
}));

// DashboardLayout renders TrialBanner/RealtimeStatusBanner unconditionally.
// Both pull in CompanyContext/react-query/useRealtimeStatus, none of which
// this test wires up — this test targets the page's own breadcrumb wiring,
// not those banners (same stub-out DashboardLayout.test.tsx uses).
vi.mock('@/components/TrialBanner', () => ({ TrialBanner: () => null }));
vi.mock('@/components/RealtimeStatusBanner', () => ({ RealtimeStatusBanner: () => null }));

describe('ReportProjectDetail breadcrumbs', () => {
  it('renders a Reports > project-number breadcrumb trail', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/reports/p1']}>
          <Routes>
            <Route path="/reports/:id" element={<ReportProjectDetail />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
    const crumbNav = await screen.findByLabelText('Breadcrumb');
    expect(crumbNav).toHaveTextContent('Reports');
    expect(crumbNav).toHaveTextContent('TF-1001');
  });
});
