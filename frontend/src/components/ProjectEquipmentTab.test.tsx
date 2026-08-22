import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectEquipmentTab } from './ProjectEquipmentTab';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userRole: 'GM' }) }));
vi.mock('@/contexts/CompanyContext', () => ({ useCompany: () => ({ company: { id: 'c1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args), auth: { getUser: () => Promise.resolve({ data: { user: null } }) } },
}));

function mockEmpty() {
  fromMock.mockImplementation((table: string) => {
    if (table === 'equipment_instances') {
      return { select: () => ({ eq: () => ({ order: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }) };
    }
    return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
  });
}

function mockOneUnit() {
  fromMock.mockImplementation((table: string) => {
    if (table === 'equipment_instances') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({
                data: [{ id: 'eq1', label: 'PTR-001', equipment_type: 'POWER_TRANSFORMER', project_id: 'p1' }],
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'test_tasks') {
      return {
        select: () => ({
          in: () => Promise.resolve({
            data: [
              { id: 't1', equipment_instance_id: 'eq1', assigned_to: null, status: 'APPROVED', test_template_id: 'tt1', test_templates: { test_name: 'Insulation', test_code: 'INS', tab: 'PARAMETERS' } },
              { id: 't2', equipment_instance_id: 'eq1', assigned_to: null, status: 'DRAFT', test_template_id: 'tt2', test_templates: { test_name: 'Ratio', test_code: 'RAT', tab: 'PARAMETERS' } },
            ],
            error: null,
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
  });
}

describe('ProjectEquipmentTab', () => {
  it('renders the shared EmptyState when there is no equipment', async () => {
    mockEmpty();
    render(<ProjectEquipmentTab projectId="p1" projectStatus="ACTIVE" />);
    await waitFor(() => expect(screen.getByText('No equipment instances yet')).toBeInTheDocument());
  });

  it('renders a per-unit completion ProgressBar', async () => {
    mockOneUnit();
    const user = userEvent.setup();
    render(<ProjectEquipmentTab projectId="p1" projectStatus="ACTIVE" />);
    await waitFor(() => expect(screen.getByText('PTR-001')).toBeInTheDocument());
    // AccordionContent is unmounted while collapsed (Radix), so open the item
    // before asserting on content rendered inside it.
    await user.click(screen.getByText('PTR-001'));
    await waitFor(() => expect(screen.getByText('50%')).toBeInTheDocument()); // 1 of 2 tasks approved
  });

  it('does not wrap the EmptyState in a second bordered Card (avoids a double border)', async () => {
    mockEmpty();
    render(<ProjectEquipmentTab projectId="p1" projectStatus="ACTIVE" />);
    await waitFor(() => expect(screen.getByText('No equipment instances yet')).toBeInTheDocument());
    const emptyStateRoot = screen.getByText('No equipment instances yet').closest('.border-dashed');
    expect(emptyStateRoot?.parentElement?.className).not.toMatch(/\bborder\b(?!-dashed)/);
  });
});
