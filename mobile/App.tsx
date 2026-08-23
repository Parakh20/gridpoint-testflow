import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkBanner } from '@/components/NetworkBanner';
import { RealtimeStatusBanner } from '@/components/RealtimeStatusBanner';
import { TrialBanner } from '@/components/TrialBanner';
import { queryClient } from '@/lib/queryClient';
import RootNavigator from '@/navigation/RootNavigator';
import { useAppForegroundRefetch } from '@/lib/appLifecycle';
import { initMonitoring } from '@/lib/monitoring';

initMonitoring();

function AppShell() {
  useAppForegroundRefetch();
  // Global status banners sit at the BOTTOM as a thin strip so they never
  // collide with the status bar / notch and the navigation header stays clean.
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style="light" />
      <RootNavigator />
      <NetworkBanner />
      <RealtimeStatusBanner />
      <TrialBanner />
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <AppShell />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
