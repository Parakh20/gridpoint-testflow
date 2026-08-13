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

// Launch-readiness failure categories. Tag captureException calls with one
// of these so Sentry alert rules (configured by a human, out of scope here)
// can filter by category — e.g. "page any payment_failure event".
export type FailureCategory =
  | 'api_error'
  | 'auth_failure'
  | 'db_error'
  | 'sync_failure'
  | 'report_failure'
  | 'payment_failure';

export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
  category?: FailureCategory,
): void {
  if (DSN) {
    Sentry.captureException(err, { extra: context, tags: category ? { category } : undefined });
  } else {
    console.error('[monitoring]', category ? `[${category}]` : '', err, context ?? {});
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
