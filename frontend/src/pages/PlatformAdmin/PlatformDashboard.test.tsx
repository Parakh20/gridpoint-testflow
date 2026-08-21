import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlatformDashboard from './PlatformDashboard';

// PlatformDashboard imports the Supabase client module (unused on this
// screen's happy path but still evaluated at import time) — createClient()
// throws at import time without a real VITE_SUPABASE_URL, so mock the client
// module itself (same pattern as BillingSettingsPage.test.tsx).
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

// PlatformDashboard fetches through platformFetch (the platform-admin-data
// Edge Function proxy) rather than the Supabase client directly — mock that
// module so the stats bar resolves without a network call.
vi.mock('./platformFetch', () => ({
  platformFetch: (action: string) => {
    if (action === 'get_stats') {
      return Promise.resolve({ total_companies: 4, total_users: 12, active_projects: 7 });
    }
    if (action === 'get_all_companies') {
      return Promise.resolve([]);
    }
    return Promise.resolve(null);
  },
}));

function setup() {
  // PlatformDashboard redirects to "/" unless platform_authed is set, and
  // treats the token as missing (skipping data fetch) unless one is stored —
  // both live in sessionStorage per platformToken.ts.
  sessionStorage.setItem('platform_authed', 'true');
  sessionStorage.setItem('platform_token', 'test-token');
  return render(
    <MemoryRouter>
      <PlatformDashboard />
    </MemoryRouter>
  );
}

describe('PlatformDashboard', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('renders the Total Companies/Users and Active Projects stats as MetricCards', async () => {
    setup();
    const companiesLabel = await screen.findByText('Total Companies');
    expect(companiesLabel).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    // MetricCard renders the value as its own <p> sibling of the label <p>,
    // using MetricCard's own type-scale classes — this is what distinguishes
    // it from the old hand-rolled `<p className="font-mono text-2xl ...">`
    // stat markup (which also happened to render plain-text numbers).
    expect(companiesLabel).toHaveClass('text-micro-label');
    expect(await screen.findByText('4')).toHaveClass('text-page-title');
    expect(screen.getByText('12')).toHaveClass('text-page-title');
    expect(screen.getByText('7')).toHaveClass('text-page-title');
  });
});
