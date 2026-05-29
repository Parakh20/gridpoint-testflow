const PROJECT_ID = 'fdb44eda-7e1e-4b67-93e9-fb314f0b105d';

export default ({ config }) => ({
  ...config,
  name: 'TestFlow Field',
  slug: 'testflow-field',
  version: '0.2.1',
  scheme: 'testflow',
  orientation: 'portrait',
  icon: './assets/icon.png',
  plugins: ['expo-web-browser', '@react-native-community/datetimepicker'],
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    backgroundColor: '#1c5cfb',
    resizeMode: 'contain',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'io.testflow.field',
    buildNumber: '3',
  },
  android: {
    package: 'io.testflow.field',
    versionCode: 3,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1c5cfb',
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
