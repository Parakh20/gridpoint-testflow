import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkBanner } from '@/components/NetworkBanner';
import { RealtimeStatusBanner } from '@/components/RealtimeStatusBanner';
import { queryClient } from '@/lib/queryClient';
import RootNavigator from '@/navigation/RootNavigator';
import { useAppForegroundRefetch } from '@/lib/appLifecycle';
import { initMonitoring } from '@/lib/monitoring';

initMonitoring();

function AppShell() {
  useAppForegroundRefetch();
  return (
    <>
      <StatusBar style="light" />
      <NetworkBanner />
      <RealtimeStatusBanner />
      <RootNavigator />
    </>
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
