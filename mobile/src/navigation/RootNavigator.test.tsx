import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest } from '@jest/globals';
import RootNavigator from './RootNavigator';

// Deliberately NOT mocking @react-navigation/native or
// @react-navigation/native-stack here (unlike the screen-level tests in
// Tasks 5-7) — this test's whole point is exercising the real
// NavigationContainer/Stack.Navigator branching logic in RootNavigator.tsx.
// Only the 18+ leaf screens it imports are stubbed to a distinguishable
// text node, so assertions check route identity, not each screen's own
// (separately-tested) render tree.

function mockStubScreen(name: string) {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  const Stub = () => ReactLib.createElement(Text, null, name);
  Stub.displayName = name;
  return { __esModule: true, default: Stub };
}

jest.mock('@/screens/LoginScreen', () => mockStubScreen('LoginScreen'));
jest.mock('@/screens/ProfileScreen', () => mockStubScreen('ProfileScreen'));
jest.mock('@/screens/RoleBlockedScreen', () => mockStubScreen('RoleBlockedScreen'));
jest.mock('@/screens/PlatformLoginScreen', () => mockStubScreen('PlatformLoginScreen'));
jest.mock('@/screens/PlatformDashboardScreen', () => mockStubScreen('PlatformDashboardScreen'));
jest.mock('@/screens/ProjectListScreen', () => mockStubScreen('ProjectListScreen'));
jest.mock('@/screens/TaskListScreen', () => mockStubScreen('TaskListScreen'));
jest.mock('@/screens/EquipmentDetailScreen', () => mockStubScreen('EquipmentDetailScreen'));
jest.mock('@/screens/TestFormScreen', () => mockStubScreen('TestFormScreen'));
jest.mock('@/screens/GMProjectsScreen', () => mockStubScreen('GMProjectsScreen'));
jest.mock('@/screens/CreateProjectScreen', () => mockStubScreen('CreateProjectScreen'));
jest.mock('@/screens/EditProjectScreen', () => mockStubScreen('EditProjectScreen'));
jest.mock('@/screens/ScopeManagementScreen', () => mockStubScreen('ScopeManagementScreen'));
jest.mock('@/screens/TestingScopeScreen', () => mockStubScreen('TestingScopeScreen'));
jest.mock('@/screens/AssignSupervisorScreen', () => mockStubScreen('AssignSupervisorScreen'));
jest.mock('@/screens/EngineerAssignmentScreen', () => mockStubScreen('EngineerAssignmentScreen'));
jest.mock('@/screens/UserManagementScreen', () => mockStubScreen('UserManagementScreen'));
jest.mock('@/screens/CreateUserScreen', () => mockStubScreen('CreateUserScreen'));
jest.mock('@/screens/UserDetailScreen', () => mockStubScreen('UserDetailScreen'));
jest.mock('@/screens/SupervisorHomeScreen', () => mockStubScreen('SupervisorHomeScreen'));
jest.mock('@/screens/ProjectOverviewScreen', () => mockStubScreen('ProjectOverviewScreen'));
jest.mock('@/screens/ReportsListScreen', () => mockStubScreen('ReportsListScreen'));
jest.mock('@/screens/ReportDetailScreen', () => mockStubScreen('ReportDetailScreen'));

const mockUseAuth = jest.fn();
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

function withRole(role: string | null, session: boolean) {
  mockUseAuth.mockReturnValue({ session: session ? {} : null, loading: false, role });
}

describe('RootNavigator — role-based routing', () => {
  it('renders LoginScreen when there is no session, regardless of role', async () => {
    withRole(null, false);
    render(<RootNavigator />);
    await waitFor(() => expect(screen.getByText('LoginScreen')).toBeTruthy());
  });

  it('shows a loading spinner while auth is resolving, before any route renders', () => {
    mockUseAuth.mockReturnValue({ session: null, loading: true, role: null });
    render(<RootNavigator />);
    expect(screen.queryByText('LoginScreen')).toBeNull();
  });

  it('routes ENGINEER to ProjectListScreen', async () => {
    withRole('ENGINEER', true);
    render(<RootNavigator />);
    await waitFor(() => expect(screen.getByText('ProjectListScreen')).toBeTruthy());
  });

  it('routes GM to GMProjectsScreen', async () => {
    withRole('GM', true);
    render(<RootNavigator />);
    await waitFor(() => expect(screen.getByText('GMProjectsScreen')).toBeTruthy());
  });

  it('routes SUPERADMIN to GMProjectsScreen (same branch as GM)', async () => {
    withRole('SUPERADMIN', true);
    render(<RootNavigator />);
    await waitFor(() => expect(screen.getByText('GMProjectsScreen')).toBeTruthy());
  });

  it('routes SUPERVISOR to SupervisorHomeScreen', async () => {
    withRole('SUPERVISOR', true);
    render(<RootNavigator />);
    await waitFor(() => expect(screen.getByText('SupervisorHomeScreen')).toBeTruthy());
  });

  it('routes an unrecognized role to RoleBlockedScreen, never a role-bearing screen', async () => {
    withRole('SOME_FUTURE_ROLE', true);
    render(<RootNavigator />);
    await waitFor(() => expect(screen.getByText('RoleBlockedScreen')).toBeTruthy());
  });
});
