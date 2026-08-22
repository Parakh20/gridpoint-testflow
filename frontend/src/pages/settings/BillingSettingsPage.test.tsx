import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import BillingSettingsPage from './BillingSettingsPage';

vi.mock('@/lib/entitlements', () => ({
  useEntitlements: () => ({
    entitlements: { planName: 'Professional', planSlug: 'professional', isCustom: false, maxUsers: 25, maxActiveProjects: 10 },
    isLoading: false,
  }),
}));
vi.mock('@/lib/usage', () => ({
  useUsage: () => ({ usage: { activeUsers: 6, activeProjects: 3, aiReportsThisMonth: 2 }, isLoading: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn(), user: { id: 'u1' }, userRole: 'GM', userName: 'Gita' }),
}));
// BillingSettingsPage imports the Supabase client directly (for the
// downgrade-options query) — createClient() throws at import time without
// a real VITE_SUPABASE_URL, so mock the client module itself (same pattern
// as UpgradeModal.test.tsx / ReportsList.test.tsx) rather than relying on env vars.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  },
}));
// DashboardLayout pulls in NotificationBell, ThemeToggle, TrialBanner, etc.
// (auth/theme/router context this test doesn't set up) — mocked to a plain
// passthrough, matching ReportsList.test.tsx / ReportProjectDetail.test.tsx
// in this same plan, since this page's test only cares about its own content.
vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function setup() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BillingSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BillingSettingsPage', () => {
  it('renders a MetricCard-based usage summary alongside the ProgressBar rows', () => {
    setup();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('AI reports this month')).toBeInTheDocument();
    // ProgressBar renders "N%" per row — Users at 6/25 -> 24%
    expect(screen.getByText('24%')).toBeInTheDocument();
  });
});
