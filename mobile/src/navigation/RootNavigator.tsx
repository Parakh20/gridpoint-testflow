import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import LoginScreen from '@/screens/LoginScreen';
import ProjectListScreen from '@/screens/ProjectListScreen';
import TaskListScreen from '@/screens/TaskListScreen';
import TestFormScreen from '@/screens/TestFormScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import RoleBlockedScreen from '@/screens/RoleBlockedScreen';
import PlatformLoginScreen from '@/screens/PlatformLoginScreen';
import PlatformDashboardScreen from '@/screens/PlatformDashboardScreen';
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
      Projects: 'projects',
      Profile: 'profile',
      Tasks: 'projects/:projectId',
      TestForm: 'tasks/:taskId',
      PlatformLogin: 'admin/login',
      PlatformDashboard: 'admin',
    },
  },
};

export default function RootNavigator() {
  const { session, loading, role } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  // Mobile app is engineer-only. Non-engineers get a friendly block screen with sign-out.
  const isEngineer = role === 'ENGINEER';

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
            <Stack.Screen
              name="PlatformLogin"
              component={PlatformLoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PlatformDashboard"
              component={PlatformDashboardScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : !isEngineer ? (
          <Stack.Screen
            name="Login"
            component={RoleBlockedScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Projects"
              component={ProjectListScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Tasks"
              component={TaskListScreen}
              options={({ route }) => ({ title: route.params.projectNumber })}
            />
            <Stack.Screen
              name="TestForm"
              component={TestFormScreen}
              options={({ route }) => ({ title: route.params.instanceLabel })}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            <Stack.Screen
              name="PlatformLogin"
              component={PlatformLoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PlatformDashboard"
              component={PlatformDashboardScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
