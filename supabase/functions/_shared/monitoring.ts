// Structured error logging for Edge Functions.
//
// There is no Sentry SDK wired for the Deno Edge Function runtime — the
// browser-side Sentry in frontend/src/lib/monitoring.ts only covers the
// browser bundle (different runtime, different DSN, different init).
// Wiring real Sentry-for-Deno needs a project/DSN decision from a human
// (see CLAUDE.md gap notes) and is out of scope here.
//
// This is the low-risk interim: every Edge Function catch block logs a
// single structured JSON line via console.error, tagged with a launch
// -readiness failure category. Supabase Edge Function logs are queryable
// in the dashboard (Edge Functions -> Logs) and exportable via `supabase
// functions logs`, so a `category` field is what a log-based alert (e.g.
// Logflare/Datadog) would filter on once a human wires one up.

export type EdgeFailureCategory =
  | 'api_error'
  | 'auth_failure'
  | 'db_error'
  | 'webhook_failure'
  | 'payment_failure'
  | 'report_failure';

export function logEdgeError(
  functionName: string,
  category: EdgeFailureCategory,
  err: unknown,
  context?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(JSON.stringify({
    level: 'error',
    function: functionName,
    category,
    message,
    stack,
    context: context ?? {},
    timestamp: new Date().toISOString(),
  }));
}
