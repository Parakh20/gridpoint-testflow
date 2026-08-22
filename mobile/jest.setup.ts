import '@testing-library/react-native/matchers';

// expo-haptics touches native APIs on every screen this plan tests
// (TestFormScreen, EquipmentDetailScreen, SupervisorHomeScreen all call
// Haptics.*Async — always wrapped in `.catch(() => {})` by the app, but Jest
// has no native Haptics module to call into at all, so stub the whole module.
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// expo-constants is read at module-load time by mobile/src/lib/supabase.ts
// (`Constants.expoConfig.extra.supabaseUrl`) — without this stub, importing
// ANY module that transitively imports '@/lib/supabase' throws before a
// single test runs, since Jest has no app.config.js extra to read.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
        realtimeEnabled: false,
      },
    },
  },
}));
