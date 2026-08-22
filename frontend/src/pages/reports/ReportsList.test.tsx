import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportsList from './ReportsList';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn(), user: { id: 'u1' }, userRole: 'GM', userName: 'Gita' }),
}));

vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ReportsList', () => {
  it('renders the EmptyState component when there are no projects', async () => {
    render(
      <MemoryRouter>
        <ReportsList />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('No reports yet')).toBeInTheDocument();
    });
  });
});
