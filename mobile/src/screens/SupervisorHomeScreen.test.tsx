import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupervisorHomeScreen from './SupervisorHomeScreen';

// RN's Alert.alert has no native module in Jest, and jest-expo's default
// mock does not auto-press any button — the screen's "Approve test?"
// confirmation would otherwise never invoke its onPress. Auto-press the
// button whose text matches the real screen's confirm label ('Approve',
// see handleApprove in SupervisorHomeScreen.tsx).
jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
  const confirm = buttons?.find((b: any) => b.text === 'Approve');
  confirm?.onPress?.();
});

const mockSetOptions = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), setOptions: mockSetOptions }),
}));
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ userId: 'sup-1', profile: { full_name: 'Sam Supervisor' } }),
}));

// SupervisorHomeScreen renders unmounted from any ToastProvider in this
// black-box test — useToast() throws without a provider in the tree.
const mockToast = {
  show: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};
jest.mock('@/components/Toast', () => ({ useToast: () => mockToast }));

const mockFrom = jest.fn<(table: string) => any>();
jest.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => mockFrom(table) } }));

function renderWithQueryClient() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SupervisorHomeScreen />
    </QueryClientProvider>
  );
}

// The real update chain (useReviewTask in useSupervisor.ts) is
// `.update(update).eq('id', taskId).eq('status', 'SUBMITTED')` — two
// chained `.eq()` calls, not one. Spy on both so we can assert the actual
// optimistic-concurrency guard call, not a loosely-matching stub.
const updateSpy = jest.fn();
const updateEqId = jest.fn((..._args: any[]) => ({ eq: updateEqStatus }));
const updateEqStatus = jest.fn((..._args: any[]) => Promise.resolve({ error: null }));

function mockSupabaseForApprove() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'projects') {
      return {
        select: (cols: string) => {
          if (cols.includes('site_name')) {
            // useSupProjects — Projects tab isn't exercised by this test.
            return { eq: () => ({ is: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) };
          }
          if (cols === 'id, project_number') {
            // usePendingReviews
            return { eq: () => Promise.resolve({ data: [{ id: 'proj-1', project_number: 'TF-1001' }], error: null }) };
          }
          // useReviewTask ownership check (select('id'))
          return {
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'proj-1' }, error: null }),
              }),
            }),
          };
        },
      };
    }
    if (table === 'equipment_instances') {
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data: [{ id: 'inst-1', project_id: 'proj-1', label: 'PTR-001', equipment_type: 'POWER_TRANSFORMER' }],
              error: null,
            }),
        }),
      };
    }
    if (table === 'test_tasks') {
      return {
        select: (cols: string) => {
          if (cols.includes('test_template:test_templates')) {
            // usePendingReviews
            return {
              in: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: 'task-1',
                        status: 'SUBMITTED',
                        rework_reason: null,
                        equipment_instance_id: 'inst-1',
                        test_template: { test_name: 'Insulation Resistance', test_code: 'IR-01' },
                      },
                    ],
                    error: null,
                  }),
              }),
            };
          }
          // useReviewTask ownership pre-flight (select with equipment_instances!inner join)
          return {
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'task-1', equipment_instance_id: 'inst-1', equipment_instances: { project_id: 'proj-1' } },
                  error: null,
                }),
              }),
            }),
          };
        },
        update: (payload: any) => {
          updateSpy(payload);
          return { eq: updateEqId };
        },
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabaseForApprove();
});

describe('SupervisorHomeScreen — approve action', () => {
  it('approves a pending task via the SUBMITTED-gated update guard', async () => {
    renderWithQueryClient();
    await waitFor(() => expect(screen.getByText('Insulation Resistance')).toBeTruthy());

    fireEvent.press(screen.getByText('Approve'));

    // Assert on the real optimistic-concurrency guard call: the update
    // targets this task by id AND is gated on status still being SUBMITTED
    // (CLAUDE.md gotcha #19 / "Status transitions" workflow note).
    await waitFor(() => expect(updateEqStatus).toHaveBeenCalledWith('status', 'SUBMITTED'));
    expect(updateEqId).toHaveBeenCalledWith('id', 'task-1');
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'APPROVED' }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Approved'));
  });
});
