import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SuperadminDashboard from './SuperadminDashboard';

// SuperadminDashboard imports the Supabase client directly — createClient()
// throws at import time without a real VITE_SUPABASE_URL, so mock the client
// module itself (same pattern as BillingSettingsPage.test.tsx). Query calls in
// this file chain a variable number of `.eq()`s before being awaited (or none
// at all), so the mock builder below is chainable AND thenable.
function makeQueryResult(result: { data: unknown[]; count?: number; error: null }) {
  const chain = {
    eq: () => chain,
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => makeQueryResult({ data: [], count: 3, error: null }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
    functions: {
      invoke: () => Promise.resolve({ data: null, error: null }),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}));

// DashboardLayout pulls in NotificationBell, ThemeToggle, TrialBanner, etc.
// (auth/theme/router context this test doesn't set up) — mocked to a plain
// passthrough, matching ReportsList.test.tsx / BillingSettingsPage.test.tsx.
vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// UserManagementTable / AuditLogViewer pull in their own Supabase queries
// and are out of scope for this MetricCard/EmptyState conversion test.
vi.mock('@/components/UserManagementTable', () => ({
  UserManagementTable: () => <div>user-management-table</div>,
}));
vi.mock('@/components/AuditLogViewer', () => ({
  AuditLogViewer: () => <div>audit-log-viewer</div>,
}));

vi.mock('@/lib/features', () => ({
  useFeature: () => true,
}));

function setup() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <SuperadminDashboard />
    </QueryClientProvider>
  );
}

describe('SuperadminDashboard', () => {
  it('renders the Total/Active Users and Active Projects stats as MetricCards', async () => {
    setup();
    const totalUsersLabel = await screen.findByText('Total Users');
    expect(totalUsersLabel).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    // MetricCard renders the value as its own <p> sibling of the label <p>,
    // using MetricCard's own type-scale classes — this is what distinguishes
    // it from the old hand-rolled Card/CardHeader/CardContent stat markup
    // (which also happened to render the same plain-text numbers). The stats
    // query resolves count: 3 for both activeUsers/activeProjects; totalUsers
    // starts at 0 (set later via UserManagementTable's onUserCountChange).
    expect(totalUsersLabel).toHaveClass('text-micro-label');
    expect(screen.getByText('0')).toHaveClass('text-page-title');
    const threes = screen.getAllByText('3');
    expect(threes.length).toBeGreaterThanOrEqual(2);
    threes.forEach(el => expect(el).toHaveClass('text-page-title'));
  });

  it('renders an EmptyState for the Google Sign-In Approvals queue when nothing is pending', async () => {
    setup();
    expect(await screen.findByText('No pending approvals.')).toBeInTheDocument();
  });
});
