import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
    user: { id: 'u1', email: 'gm@example.com' },
    userRole: 'GM',
    userName: 'Gita Mehta',
  }),
}));
// DashboardLayout's bottom bar renders NotificationBell unconditionally,
// which imports the real Supabase client — that client throws at module
// load ("supabaseUrl is required") because this environment has no
// VITE_SUPABASE_URL/.env. Other tests touching Supabase-backed components
// (SubscriptionActions.test.tsx, UpgradeModal.test.tsx) mock the client the
// same way. GM never hits the SUPERVISOR/ENGINEER notification-fetch path,
// so a minimal chainable stub is enough to satisfy the import and the
// realtime-channel subscribe/cleanup calls in NotificationBell/lib/realtime.
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
      from: () => chain,
      channel: () => channel,
      removeChannel: () => {},
    },
  };
});
// DashboardLayout renders TrialBanner/RealtimeStatusBanner unconditionally.
// Both pull in CompanyContext/react-query/supabase/useRealtimeStatus, none
// of which this test wires up — this test targets sidebar/topbar behavior,
// not those banners' own logic (which has its own coverage elsewhere), so
// stub them out.
vi.mock('@/components/TrialBanner', () => ({ TrialBanner: () => null }));
vi.mock('@/components/RealtimeStatusBanner', () => ({ RealtimeStatusBanner: () => null }));

// The collapse test writes tf.sidebar.collapsed to localStorage, which
// jsdom persists across tests within this file. Clear it before every test
// so no test's assertions depend on run order.
beforeEach(() => {
  localStorage.clear();
});

function setup() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/gm']}>
        <DashboardLayout title="Projects">
          <div>content</div>
        </DashboardLayout>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('DashboardLayout sidebar', () => {
  it('groups GM nav items under headings', () => {
    setup();
    expect(screen.getByText('WORKSPACE')).toBeInTheDocument();
    // 'Projects' also appears in the topbar <h1 title="Projects">, so scope
    // to the nav button (same disambiguation the "marks the active route"
    // test below already relies on).
    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('REPORTING')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('marks the active route', () => {
    setup();
    const projectsLink = screen.getByRole('button', { name: /Projects/ });
    expect(projectsLink).toHaveClass('bg-primary/15');
  });

  it('collapses and persists the collapsed state to localStorage', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.queryByText('WORKSPACE')).not.toBeInTheDocument();
    expect(localStorage.getItem('tf.sidebar.collapsed')).toBe('true');
  });

  it('expands and persists the expanded state to localStorage', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.queryByText('WORKSPACE')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(screen.getByText('WORKSPACE')).toBeInTheDocument();
    expect(localStorage.getItem('tf.sidebar.collapsed')).toBe('false');
  });

  it('renders already collapsed when localStorage has a persisted collapsed flag before mount', () => {
    localStorage.setItem('tf.sidebar.collapsed', 'true');
    setup();
    expect(screen.queryByText('WORKSPACE')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });
});

describe('DashboardLayout topbar', () => {
  it('renders only the title when no breadcrumbs are passed (backward compatible)', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/gm']}>
          <DashboardLayout title="Projects">
            <div>content</div>
          </DashboardLayout>
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Breadcrumb')).not.toBeInTheDocument();
  });

  it('renders breadcrumb links when provided', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/gm']}>
          <DashboardLayout title="TF-1024" breadcrumbs={[{ label: 'Projects', href: '/gm' }, { label: 'TF-1024' }]}>
            <div>content</div>
          </DashboardLayout>
        </MemoryRouter>
      </ThemeProvider>
    );
    const crumbNav = screen.getByLabelText('Breadcrumb');
    expect(crumbNav).toHaveTextContent('Projects');
    expect(crumbNav).toHaveTextContent('TF-1024');
  });

  it('opens the command menu on Ctrl+K from within the layout', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/gm']}>
          <DashboardLayout title="Projects">
            <div>content</div>
          </DashboardLayout>
        </MemoryRouter>
      </ThemeProvider>
    );
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument();
  });
});
