/**
 * Error monitoring abstraction.
 *
 * Wraps Sentry (or any future provider) behind a thin interface so the rest
 * of the app stays provider-agnostic. Currently a console-only no-op until
 * Sentry is wired up.
 *
 * To activate Sentry:
 *   1. npm install @sentry/react
 *   2. Set VITE_SENTRY_DSN in frontend/.env (and Vercel env)
 *   3. Uncomment the import + the two lines marked "SENTRY" below
 *   4. Rebuild
 *
 * Everything else in the app calls captureException / setUserContext —
 * those calls become no-ops if Sentry isn't initialized, so no code changes
 * elsewhere when you toggle Sentry on/off.
 */

// SENTRY: import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE;

let initialized = false;

export function initMonitoring(): void {
  if (initialized || !DSN) return;

  // SENTRY: Sentry.init({
  //   dsn: DSN,
  //   environment: ENV,
  //   tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
  //   replaysSessionSampleRate: 0,
  //   replaysOnErrorSampleRate: 1.0,
  //   integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  // });

  initialized = true;
  if (ENV !== 'production') {
    console.info('[monitoring] DSN present but @sentry/react not wired — see lib/monitoring.ts');
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (initialized) {
    // SENTRY: Sentry.captureException(err, { extra: context });
  }
  // Always log to console — useful in dev and as fallback
  console.error('[monitoring]', err, context ?? {});
}

export function setUserContext(user: { id: string; email?: string | null; role?: string | null; companyId?: string | null } | null): void {
  if (!initialized) return;
  // SENTRY: if (user) Sentry.setUser({ id: user.id, email: user.email ?? undefined, role: user.role, company: user.companyId });
  // SENTRY: else Sentry.setUser(null);
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!initialized) return;
  // SENTRY: Sentry.addBreadcrumb({ message, data, level: 'info' });
}
