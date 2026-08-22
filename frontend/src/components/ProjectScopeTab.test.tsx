import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProjectScopeTab } from './ProjectScopeTab';

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

function mockScopeItems(rows: Array<{ id: string; equipment_type: string; quantity: number }>) {
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: rows, error: null }),
      }),
    }),
  });
}

describe('ProjectScopeTab', () => {
  it('renders the shared EmptyState when there is no scope', async () => {
    mockScopeItems([]);
    render(<ProjectScopeTab projectId="p1" />);
    await waitFor(() => expect(screen.getByText('No equipment scope defined')).toBeInTheDocument());
    expect(screen.getByText(/define equipment types and quantities/i)).toBeInTheDocument();
  });

  it('renders the scope table with a total row when scope exists', async () => {
    mockScopeItems([
      { id: 's1', equipment_type: 'POWER_TRANSFORMER', quantity: 3 },
      { id: 's2', equipment_type: 'CT', quantity: 5 },
    ]);
    render(<ProjectScopeTab projectId="p1" />);
    await waitFor(() => expect(screen.getByText('POWER TRANSFORMER')).toBeInTheDocument());
    expect(screen.getByText('CT')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // total row
  });

  it('does not wrap the EmptyState in a second bordered Card (avoids a double border)', async () => {
    mockScopeItems([]);
    render(<ProjectScopeTab projectId="p1" />);
    await waitFor(() => expect(screen.getByText('No equipment scope defined')).toBeInTheDocument());
    // EmptyState's own border-dashed container should not have a solid-bordered
    // Card ancestor — the Card wrapper (`rounded-lg border bg-card`) is the bug.
    const emptyStateRoot = screen.getByText('No equipment scope defined').closest('.border-dashed');
    expect(emptyStateRoot?.parentElement?.className).not.toMatch(/\bborder\b(?!-dashed)/);
  });
});
