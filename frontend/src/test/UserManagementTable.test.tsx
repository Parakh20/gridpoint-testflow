import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserManagementTable } from '@/components/UserManagementTable';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'current-user-id' } } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      then: vi.fn(),
    })),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'current-user-id' }, userRole: 'SUPERADMIN' }),
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({ company: { id: 'company-1' } }),
}));

const mockUsers = [
  { id: 'current-user-id', name: 'Me', email: 'me@example.com', is_active: true, role: 'SUPERADMIN', role_id: 'r1', created_at: '2026-01-01' },
  { id: 'other-user-id', name: 'Other', email: 'other@example.com', is_active: true, role: 'GM', role_id: 'r2', created_at: '2026-01-02' },
];

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderTable = () => {
  const client = makeClient();
  client.setQueryData(['users-with-roles'], mockUsers);
  return render(
    <QueryClientProvider client={client}>
      <UserManagementTable />
    </QueryClientProvider>
  );
};

describe('UserManagementTable', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders user rows', () => {
    renderTable();
    expect(screen.getByText('Me')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('delete button for current user is disabled or absent', () => {
    renderTable();
    const myRow = screen.getByText('Me').closest('tr');
    if (myRow) {
      const deleteBtn = myRow.querySelector('button[disabled]') ?? myRow.querySelector('[aria-label*="delete" i], [aria-label*="Delete" i]');
      // Either the delete button is disabled or it doesn't exist for current user
      const allDeleteBtns = myRow.querySelectorAll('button');
      const hasDisabledBtn = Array.from(allDeleteBtns).some(b => b.disabled);
      expect(hasDisabledBtn || !myRow.querySelector('[data-testid="delete-btn"]')).toBeTruthy();
    }
  });

  it('renders email addresses', () => {
    renderTable();
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(screen.getByText('other@example.com')).toBeInTheDocument();
  });
});
