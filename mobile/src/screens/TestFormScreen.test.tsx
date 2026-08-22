import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestFormScreen from './TestFormScreen';

// TestFormScreen calls useQueryClient() (to invalidate ['tasks']/['projects']
// on submit) — it needs a real QueryClientProvider ancestor, not a mock.
function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TestFormScreen />
    </QueryClientProvider>
  );
}

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAddListener = jest.fn(() => () => {});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, addListener: mockAddListener }),
  useRoute: () => ({
    params: {
      taskId: 'task-1',
      templateId: 'tpl-1',
      instanceLabel: 'PTR-001',
      testName: 'Insulation Resistance',
      currentStatus: 'DRAFT',
    },
  }),
}));
jest.mock('@react-navigation/elements', () => ({ useHeaderHeight: () => 0 }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 'user-1' }) }));

// TestFormScreen renders unmounted from any ToastProvider in this black-box
// test — useToast() throws without a provider in the tree, so stub the hook.
// Critical: mockToast must be a SINGLE stable object. `persistRecord`
// (useCallback) depends on `toast`, and the initial-load useEffect depends
// on `toast` too — if useToast() returned a fresh object on every render (as
// an inline `() => ({...})` factory does), both would change identity every
// render and re-fire every render, causing an infinite fetch loop that starves
// the autosave debounce. The `mock` name prefix is required for
// babel-plugin-jest-hoist to allow referencing it from the jest.mock factory.
const mockToast = {
  show: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};
jest.mock('@/components/Toast', () => ({ useToast: () => mockToast }));

const upsertSelectSingle = jest.fn<() => Promise<any>>();
const mockFrom = jest.fn<(table: string) => any>();
jest.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => mockFrom(table) } }));

function mockTemplateAndRecordFetch(fields: any[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'test_templates') {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { fields }, error: null }) }) }) };
    }
    if (table === 'test_records') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        upsert: () => ({ select: () => ({ single: upsertSelectSingle }) }),
      };
    }
    if (table === 'test_tasks') {
      return {
        update: () => ({
          eq: () => ({ in: () => ({ select: async () => ({ data: [{ id: 'task-1' }], error: null }) }) }),
        }),
      };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  upsertSelectSingle.mockResolvedValue({ data: { id: 'record-1' }, error: null });
});

describe('TestFormScreen', () => {
  it('blocks submit and shows a warning when a required field is empty', async () => {
    mockTemplateAndRecordFetch([{ name: 'reading', label: 'Reading', type: 'number', required: true }]);
    renderScreen();
    await waitFor(() => expect(screen.getByText('Insulation Resistance')).toBeTruthy());

    fireEvent.press(screen.getByText('Submit'));

    // The Alert.alert submit-confirmation dialog must NOT appear — missing
    // required fields short-circuit before the confirmation prompt.
    await waitFor(() => expect(screen.getByText('Required')).toBeTruthy());
  });

  it('renders gracefully when the template has an empty fields array (CLAUDE.md gotcha #4)', async () => {
    mockTemplateAndRecordFetch([]);
    renderScreen();
    await waitFor(() =>
      expect(
        screen.getByText(/This test template has no structured fields/i)
      ).toBeTruthy()
    );
  });

  it('autosaves via upsert with onConflict test_task_id after a debounced field edit', async () => {
    const upsertSpy = jest.fn<(payload: any, opts: any) => any>(() => ({
      select: () => ({ single: upsertSelectSingle }),
    }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'test_templates') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { fields: [{ name: 'reading', label: 'Reading', type: 'number' }] }, error: null }) }) }) };
      }
      if (table === 'test_records') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          upsert: upsertSpy,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    renderScreen();
    await waitFor(() => expect(screen.getByText('Insulation Resistance')).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText('Enter value'), '12.5');

    // AUTOSAVE_DEBOUNCE_MS = 1500. Real timers + a generous waitFor timeout
    // exercise the actual debounced-upsert behavior end to end.
    await waitFor(() => expect(upsertSpy).toHaveBeenCalled(), { timeout: 4000 });

    const call = upsertSpy.mock.calls[0]!;
    const [payload, opts] = call;
    expect(opts).toEqual({ onConflict: 'test_task_id' });
    expect(payload.data.reading).toBe(12.5);
  }, 8000);
});
