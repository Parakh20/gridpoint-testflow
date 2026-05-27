const PROJECT_ID = 'fdb44eda-7e1e-4b67-93e9-fb314f0b105d';

export default ({ config }) => ({
  ...config,
  name: 'TestFlow Field',
  slug: 'testflow-field',
  version: '0.1.0',
  scheme: 'testflow',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  splash: {
    backgroundColor: '#232229',
    resizeMode: 'contain',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'io.testflow.field',
  },
  android: {
    package: 'io.testflow.field',
    adaptiveIcon: {
      backgroundColor: '#232229',
    },
  },
  updates: {
    url: `https://u.expo.dev/${PROJECT_ID}`,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    realtimeEnabled: false,
    // Set PLATFORM_ADMIN_PASSWORD + PLATFORM_ADMIN_TOKEN as EAS secrets before running eas build
    platformAdminPassword: process.env.PLATFORM_ADMIN_PASSWORD ?? '',
    platformAdminToken: process.env.PLATFORM_ADMIN_TOKEN ?? '',
    eas: {
      projectId: PROJECT_ID,
    },
  },
});
