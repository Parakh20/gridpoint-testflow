// Daily backstop: flip any subscription whose cancel_at has passed to
// 'cancelled', independent of whether a Razorpay webhook ever confirms it
// (today it never does — the provider-side cancel call is still a TODO in
// manage-subscription/index.ts). See docs/dev/BILLING_QA_MATRIX.md scenario 6
// and supabase/migrations/20260814000002_webhook_ordering_and_cancel_backstop.sql.
//
// Triggered by .github/workflows/reconcile-cancellations.yml on a daily cron,
// not by a user — gated by a shared secret (RECONCILE_CRON_SECRET) rather
// than a user session, same pattern as PLATFORM_ADMIN_TOKEN but scoped to
// this one narrow action.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logEdgeError } from '../_shared/monitoring.ts';

function tokensMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const expected = Deno.env.get('RECONCILE_CRON_SECRET');
    const provided = req.headers.get('X-Cron-Secret') ?? '';
    if (!expected || !provided || !tokensMatch(provided, expected)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: flippedCount, error } = await supabase.rpc('flip_expired_cancellations');
    if (error) {
      logEdgeError('reconcile-cancellations', 'db_error', error);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, flipped: flippedCount ?? 0 });
  } catch (err) {
    logEdgeError('reconcile-cancellations', 'db_error', err);
    return json({ error: (err as Error).message }, 500);
  }
});
