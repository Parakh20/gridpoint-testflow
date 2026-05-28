import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import LoginScreen from '@/screens/LoginScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import RoleBlockedScreen from '@/screens/RoleBlockedScreen';
import PlatformLoginScreen from '@/screens/PlatformLoginScreen';
import PlatformDashboardScreen from '@/screens/PlatformDashboardScreen';
// Engineer
import ProjectListScreen from '@/screens/ProjectListScreen';
import TaskListScreen from '@/screens/TaskListScreen';
import EquipmentDetailScreen from '@/screens/EquipmentDetailScreen';
import TestFormScreen from '@/screens/TestFormScreen';
// GM
import GMProjectsScreen from '@/screens/GMProjectsScreen';
// Supervisor
import SupervisorHomeScreen from '@/screens/SupervisorHomeScreen';
// Shared
import ProjectOverviewScreen from '@/screens/ProjectOverviewScreen';
import type { RootStackParamList } from './types';
import { theme } from '@/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.bg,
    card: theme.bg,
    text: theme.text,
    border: theme.border,
    primary: theme.primary,
    notification: theme.primary,
  },
};

const linking = {
  prefixes: ['testflow://'],
  config: {
    screens: {
      Login: 'login',
      Profile: 'profile',
      Projects: 'projects',
      Tasks: 'projects/:projectId',
      EquipmentDetail: 'projects/:projectId/equipment/:instanceId',
      TestForm: 'tasks/:taskId',
      GMProjects: 'gm/projects',
      SupervisorHome: 'supervisor',
      ProjectOverview: 'projects/:projectId/overview',
      PlatformLogin: 'admin/login',
      PlatformDashboard: 'admin',
    },
  },
};

export default function RootNavigator() {
  const { session, loading, role } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  // Shared non-auth screens (platform admin)
  const platformScreens = (
    <>
      <Stack.Screen name="PlatformLogin" component={PlatformLoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlatformDashboard" component={PlatformDashboardScreen} options={{ headerShown: false }} />
    </>
  );

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTitleStyle: { color: theme.text },
          headerTintColor: theme.primary,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            {platformScreens}
          </>
        ) : role === 'ENGINEER' ? (
          <>
            <Stack.Screen name="Projects" component={ProjectListScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Tasks" component={TaskListScreen}
              options={({ route }) => ({ title: route.params.projectNumber })} />
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen}
              options={({ route }) => ({ title: route.params.instanceLabel })} />
            <Stack.Screen name="TestForm" component={TestFormScreen}
              options={({ route }) => ({ title: route.params.instanceLabel })} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            {platformScreens}
          </>
        ) : role === 'GM' || role === 'SUPERADMIN' ? (
          <>
            <Stack.Screen name="GMProjects" component={GMProjectsScreen}
              options={{ title: role === 'SUPERADMIN' ? 'All Projects (Admin)' : 'All Projects' }} />
            <Stack.Screen name="ProjectOverview" component={ProjectOverviewScreen}
              options={({ route }) => ({ title: route.params.projectNumber })} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            {platformScreens}
          </>
        ) : role === 'SUPERVISOR' ? (
          <>
            <Stack.Screen name="SupervisorHome" component={SupervisorHomeScreen} options={{ title: 'Supervisor' }} />
            <Stack.Screen name="ProjectOverview" component={ProjectOverviewScreen}
              options={({ route }) => ({ title: route.params.projectNumber })} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            {platformScreens}
          </>
        ) : (
          // Unknown role — no access
          <>
            <Stack.Screen name="Login" component={RoleBlockedScreen} options={{ headerShown: false }} />
            {platformScreens}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
