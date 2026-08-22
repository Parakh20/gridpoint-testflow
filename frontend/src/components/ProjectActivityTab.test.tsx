import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProjectActivityTab } from './ProjectActivityTab';

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

describe('ProjectActivityTab', () => {
  it('renders the shared EmptyState when there is no audit history', async () => {
    fromMock.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    });
    render(<ProjectActivityTab projectId="p1" />);
    await waitFor(() => expect(screen.getByText('No activity yet')).toBeInTheDocument());
  });
});
