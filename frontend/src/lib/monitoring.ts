import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE;

export function initMonitoring(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    sendDefaultPii: true,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (DSN) {
    Sentry.captureException(err, { extra: context });
  } else {
    console.error('[monitoring]', err, context ?? {});
  }
}

export function setUserContext(
  user: { id: string; email?: string | null; role?: string | null; companyId?: string | null } | null,
): void {
  if (!DSN) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email ?? undefined, role: user.role ?? undefined, company: user.companyId ?? undefined });
  } else {
    Sentry.setUser(null);
  }
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.addBreadcrumb({ message, data, level: 'info' });
}
