import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateProjectScreen from './CreateProjectScreen';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: mockGoBack }) }));
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ userId: 'gm-1', profile: { company_id: 'co-1' } }),
}));

// CreateProjectScreen renders unmounted from any ToastProvider in this
// black-box test — useToast() throws without a provider in the tree, so
// stub the hook (same pattern as TestFormScreen.test.tsx).
const mockToast = {
  show: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};
jest.mock('@/components/Toast', () => ({ useToast: () => mockToast }));

const mockInsert = jest.fn<(...a: any[]) => any>();
// check_can_create_project is the plan-gate pre-flight the screen runs before
// inserting; default it to "allowed" so the existing cases exercise the insert
// path, and override it per-test for the limit-reached case.
const mockRpc = jest.fn<(...a: any[]) => any>();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ insert: (...a: any[]) => mockInsert(...a) }),
    rpc: (...a: any[]) => mockRpc(...a),
  },
}));

// DateField renders a real @react-native-community/datetimepicker only
// while its internal `open` state is true (after the field is pressed).
// That native module has no JS behavior to exercise in Jest, so replace it
// with a lightweight stand-in that immediately surfaces the onChange
// handler for tests to invoke via fireEvent(..., 'change', event, date).
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="mock-date-picker" {...props} />,
  };
});

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CreateProjectScreen />
    </QueryClientProvider>
  );
}

// Opens whichever DateField is currently showing "Select date" (Start Date
// is declared first in the JSX, so it is always index 0 while unset; once
// Start is set, only End remains and becomes the sole match) and fires the
// mocked DateTimePicker's onChange with the given ISO date.
function pickFirstUnsetDate(iso: string) {
  const opener = screen.getAllByText('Select date')[0];
  fireEvent.press(opener);
  const pickers = screen.getAllByTestId('mock-date-picker');
  const picker = pickers[pickers.length - 1];
  const [y, m, d] = iso.split('-').map(Number);
  fireEvent(picker, 'change', { type: 'set' }, new Date(y, m - 1, d));
}

function fillRequiredFields() {
  fireEvent.changeText(screen.getByPlaceholderText('e.g. PRJ-2026-001'), 'TF-2001');
  fireEvent.changeText(screen.getByPlaceholderText('e.g. Nashik 220kV Substation'), 'Substation A');
  fireEvent.changeText(screen.getByPlaceholderText('Full site address'), '1 Main St');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRpc.mockResolvedValue({ data: { allowed: true }, error: null });
});

describe('CreateProjectScreen', () => {
  it('blocks submit when required fields are empty and never calls insert', () => {
    renderScreen();
    fireEvent.press(screen.getByText('Create Project'));
    expect(mockInsert).not.toHaveBeenCalled();
    expect(screen.getAllByText('Required').length).toBeGreaterThan(0);
  });

  it('rejects an end date before the start date without calling insert', () => {
    renderScreen();
    fillRequiredFields();

    pickFirstUnsetDate('2026-08-20'); // Start Date
    pickFirstUnsetDate('2026-08-10'); // End Date — before Start

    fireEvent.press(screen.getByText('Create Project'));

    expect(mockInsert).not.toHaveBeenCalled();
    expect(screen.getByText('End date must be after start date')).toBeTruthy();
  });

  it('submits and navigates back on success', async () => {
    mockInsert.mockResolvedValue({ error: null });
    renderScreen();
    fillRequiredFields();
    fireEvent.press(screen.getByText('Create Project'));

    await waitFor(() => expect(mockInsert).toHaveBeenCalled());
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      project_number: 'TF-2001',
      site_name: 'Substation A',
      site_address: '1 Main St',
      created_by: 'gm-1',
      company_id: 'co-1',
    });
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });

  it('surfaces a friendly duplicate-project-number error on a 23505 conflict', async () => {
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    renderScreen();
    fillRequiredFields();
    fireEvent.press(screen.getByText('Create Project'));

    await waitFor(() => expect(screen.getByText('Project number already exists')).toBeTruthy());
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('blocks creation with a plan-limit message when the company is at its project cap', async () => {
    // Arrange
    mockRpc.mockResolvedValue({
      data: { allowed: false, current: 5, limit: 5, required_plan: 'business' },
      error: null,
    });
    renderScreen();
    fillRequiredFields();

    // Act
    fireEvent.press(screen.getByText('Create Project'));

    // Assert
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        'Active project limit reached (5 of 5 used). Ask your administrator to upgrade to the business plan.',
      ),
    );
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
