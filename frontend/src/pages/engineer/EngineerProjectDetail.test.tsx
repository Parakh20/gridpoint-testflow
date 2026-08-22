import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EngineerProjectDetail from './EngineerProjectDetail';

// Setup test data
function instanceRow(id: string, label: string, equipmentType: string) {
  return { id, label, equipment_type: equipmentType, project_id: 'p1' };
}

const manyInstances = Array.from({ length: 12 }, (_, i) =>
  instanceRow(`e${i}`, `PTR-${String(i + 1).padStart(3, '0')}`, 'POWER_TRANSFORMER')
);

const mockAssignedTasks = Array.from({ length: 12 }, (_, i) => ({
  id: `task${i}`,
  equipment_instance_id: `e${i}`,
}));

const mockTestTasks = Array.from({ length: 12 }, (_, i) => ({
  id: `task${i}`,
  status: 'DRAFT',
  rework_reason: null,
  equipment_instance_id: `e${i}`,
  assigned_to: 'eng-1',
  equipment_instance: manyInstances[i],
  test_template: { id: `template${i}`, test_name: 'Test', test_code: 'TEST', fields: [] },
}));

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'eng-1' }, userRole: 'ENGINEER', userName: 'Priya Rao', signOut: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({ company: { id: 'c1', name: 'Demo', trial_ends_at: null }, companyLoading: false }),
  CompanyProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children, title, breadcrumbs }: any) => (
    <div>
      {breadcrumbs && <div aria-label="Breadcrumb">{breadcrumbs.length}</div>}
      <div data-testid="dashboard-content">{children}</div>
    </div>
  ),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { id: 'p1', project_number: 'TF-1024', status: 'ACTIVE', site_name: 'Substation A' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'equipment_instances') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: manyInstances, error: null }),
          }),
        };
      }
      if (table === 'test_tasks') {
        return {
          select: () => ({
            in: (field: string, values: any) => ({
              eq: () => Promise.resolve({ data: mockAssignedTasks, error: null }),
              order: () => Promise.resolve({ data: mockTestTasks, error: null }),
            }),
            eq: () => ({
              order: () => Promise.resolve({ data: mockTestTasks, error: null }),
            }),
          }),
        };
      }
      if (table === 'test_records') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    },
  },
}));

// Test setup
function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/engineer/projects/p1']}>
        <Routes>
          <Route path="/engineer/projects/:id" element={<EngineerProjectDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Tests
describe('EngineerProjectDetail loading state', () => {
  it('passes breadcrumbs on the loading-state DashboardLayout call too (no header shift on load)', () => {
    setup();
    // Check that breadcrumbs are rendered in the loading state (aria-label="Breadcrumb" with content)
    const breadcrumbs = screen.queryByLabelText('Breadcrumb');
    expect(breadcrumbs).toBeInTheDocument();
  });
});

describe('EngineerProjectDetail equipment matrix', () => {
  it('groups the equipment matrix with role="group" and an aria-label', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('PTR-001')).toBeInTheDocument());
    expect(screen.getByRole('group', { name: /equipment/i })).toBeInTheDocument();
  });

  it('renders a filter input once instance count is large enough to warrant one', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('PTR-001')).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/filter equipment/i)).toBeInTheDocument();
  });

  it('filters the visible equipment cards by typed query', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(screen.getByText('PTR-001')).toBeInTheDocument());
    const filterInput = screen.getByPlaceholderText(/filter equipment/i) as HTMLInputElement;
    await user.clear(filterInput);
    await user.type(filterInput, 'PTR-002');
    await waitFor(() => {
      expect(screen.queryByText('PTR-001')).not.toBeInTheDocument();
      expect(screen.getByText('PTR-002')).toBeInTheDocument();
    });
  });
});
