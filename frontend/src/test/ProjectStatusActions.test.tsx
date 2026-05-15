import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectStatusActions } from '@/components/ProjectStatusActions';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { assigned_to: 'supervisor-1' }, error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [{ id: 'inst-1' }], error: null })),
        })),
      })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const baseProject = { id: 'proj-1', status: 'DRAFT', project_number: 'TP-001' };

const renderActions = (status: string, role: string = 'GM') => {
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, userRole: role });
  return render(
    <MemoryRouter>
      <ProjectStatusActions project={{ ...baseProject, status } as any} onStatusChange={vi.fn()} />
    </MemoryRouter>
  );
};

describe('ProjectStatusActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DRAFT: shows Edit, Approve, and Delete buttons for GM', () => {
    renderActions('DRAFT', 'GM');
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('APPROVED: shows Revert to Draft, Edit, and Activate buttons', () => {
    renderActions('APPROVED', 'GM');
    expect(screen.getByRole('button', { name: /revert to draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
  });

  it('ACTIVE: shows Close Project button', () => {
    renderActions('ACTIVE', 'GM');
    expect(screen.getByRole('button', { name: /close project/i })).toBeInTheDocument();
  });

  it('CLOSED: renders no transition buttons', () => {
    renderActions('CLOSED', 'GM');
    expect(screen.queryByRole('button', { name: /approve|activate|close project|revert/i })).not.toBeInTheDocument();
  });

  it('DRAFT: shows at least one action button for GM', () => {
    renderActions('DRAFT', 'GM');
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
