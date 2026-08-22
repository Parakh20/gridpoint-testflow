import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SalesTab } from './SalesTab';

// SalesTab imports the Supabase client transitively via useToast/platformFetch's
// sibling modules in this panel — mock it the same way PlatformDashboard.test.tsx
// does, so import-time createClient() doesn't throw without a real
// VITE_SUPABASE_URL.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

// Mock the platform-admin-data proxy so the leads table resolves without a
// network call. Empty array exercises the "No leads yet." EmptyState path.
vi.mock('./platformFetch', () => ({
  platformFetch: (action: string) => {
    if (action === 'get_all_leads') {
      return Promise.resolve({ leads: [] });
    }
    return Promise.resolve(null);
  },
}));

describe('SalesTab', () => {
  it('renders an EmptyState for the leads table when there are no leads', async () => {
    render(<SalesTab active />);
    const title = await screen.findByText('No leads yet.');
    expect(title).toBeInTheDocument();
    // EmptyState renders its title in a <p> inside a dashed-border container —
    // distinguishes it from the old hand-rolled `py-16 text-center` div.
    expect(title.closest('div')).toHaveClass('border-dashed');
  });
});
