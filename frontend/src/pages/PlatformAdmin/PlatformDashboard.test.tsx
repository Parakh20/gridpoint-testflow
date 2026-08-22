import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlatformDashboard from './PlatformDashboard';

// Radix's Tabs.Trigger switches tabs on mousedown/focus (not click), so
// dispatch mouseDown directly rather than pulling in @testing-library/user-event.
function selectTab(name: RegExp) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }));
}

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
    if (action === 'get_all_users') {
      return Promise.resolve({ users: [] });
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

  it('renders an EmptyState for the Companies tab when there are no companies', async () => {
    setup();
    const title = await screen.findByText('No companies yet. Create one below.');
    expect(title).toBeInTheDocument();
    // EmptyState renders its title in a <p> inside a dashed-border container —
    // distinguishes it from the old hand-rolled `py-16 text-center` div.
    expect(title.closest('div')).toHaveClass('border-dashed');
  });

  it('renders an EmptyState for the Users tab when there are no users', async () => {
    setup();
    // Wait for initial load to settle so the tab list is interactive.
    await screen.findByText('Total Companies');
    selectTab(/All Users/i);
    const title = await screen.findByText('No users found.');
    expect(title).toBeInTheDocument();
    expect(title.closest('div')).toHaveClass('border-dashed');
  });

  it('renders Skeleton placeholders in MetricCard stat values while loading, not a plain em-dash', async () => {
    // Get the mocked platformFetch and override it to return a promise that never resolves,
    // keeping loadingData = true so we can test the loading state rendering
    const platformFetchModule = await import('./platformFetch');
    const originalPlatformFetch = vi.mocked(platformFetchModule).platformFetch;

    // Replace the mock to never resolve
    vi.mocked(platformFetchModule).platformFetch = vi.fn(
      () => new Promise(() => { /* never resolves */ })
    );

    try {
      setup();

      // Give the component a moment to initialize and start the fetch
      await new Promise(resolve => setTimeout(resolve, 50));

      // While loading, MetricCard values should render Skeleton elements
      // (with animate-pulse class from @/components/ui/skeleton), not a literal '—' em-dash.
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);

      // Verify the em-dash placeholder is NOT rendered in the stat cards
      expect(screen.queryByText('—')).not.toBeInTheDocument();
    } finally {
      // Restore original mock
      vi.mocked(platformFetchModule).platformFetch = originalPlatformFetch;
    }
  });
});
