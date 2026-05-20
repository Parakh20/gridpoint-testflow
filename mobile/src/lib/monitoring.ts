/**
 * Mobile-side mirror of frontend/src/lib/monitoring.ts.
 *
 * Same API, same activation steps — keeps the two clients reporting through
 * the same Sentry project once activated, with shared user/role/company tags.
 *
 * To activate Sentry on mobile:
 *   1. npm install @sentry/react-native
 *   2. Add `sentryDsn` to mobile/app.json → expo.extra
 *      (or set EXPO_PUBLIC_SENTRY_DSN if you'd rather use env-based plugins)
 *   3. Uncomment the import + the SENTRY-marked lines below
 *   4. Run `npx expo prebuild` so the native module is linked
 *   5. EAS Build (Expo Go doesn't ship native crash handlers)
 *
 * Everything else in the app calls captureException / setUserContext — those
 * calls become no-ops if Sentry isn't initialized, so no code changes when
 * you toggle Sentry on/off.
 */

import Constants from 'expo-constants';

// SENTRY: import * as Sentry from '@sentry/react-native';

const DSN = (Constants.expoConfig?.extra as any)?.sentryDsn as string | undefined;
const ENV: 'production' | 'development' = __DEV__ ? 'development' : 'production';

let initialized = false;

export function initMonitoring(): void {
  if (initialized || !DSN) return;

  // SENTRY: Sentry.init({
  // SENTRY:   dsn: DSN,
  // SENTRY:   environment: ENV,
  // SENTRY:   enableAutoSessionTracking: true,
  // SENTRY:   tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
  // SENTRY:   debug: ENV !== 'production',
  // SENTRY: });

  initialized = true;
  if (ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info('[monitoring] DSN present but @sentry/react-native not wired — see lib/monitoring.ts');
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (initialized) {
    // SENTRY: Sentry.captureException(err, { extra: context });
  }
  // Always log to console — useful in Expo Go and as a fallback.
  // eslint-disable-next-line no-console
  console.error('[monitoring]', err, context ?? {});
}

export function setUserContext(
  user: {
    id: string;
    email?: string | null;
    role?: string | null;
    companyId?: string | null;
  } | null
): void {
  if (!initialized) return;
  // SENTRY: if (user) {
  // SENTRY:   Sentry.setUser({
  // SENTRY:     id: user.id,
  // SENTRY:     email: user.email ?? undefined,
  // SENTRY:   });
  // SENTRY:   Sentry.setTag('role', user.role ?? 'unknown');
  // SENTRY:   Sentry.setTag('company', user.companyId ?? 'unknown');
  // SENTRY: } else {
  // SENTRY:   Sentry.setUser(null);
  // SENTRY: }
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!initialized) return;
  // SENTRY: Sentry.addBreadcrumb({ message, data, level: 'info' });
}
