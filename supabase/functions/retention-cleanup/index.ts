// Nightly backstop for IMPROVEMENTS.md's "Soft-deleted projects never
// hard-deleted" and "Audit log retention policy" gaps. Triggered by
// .github/workflows/retention-cleanup.yml — gated by X-Cron-Secret, same
// pattern as reconcile-cancellations.
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

    const [purgeResult, archiveResult] = await Promise.all([
      supabase.rpc('purge_old_soft_deleted'),
      supabase.rpc('archive_old_audit_logs'),
    ]);

    if (purgeResult.error) {
      logEdgeError('retention-cleanup', 'db_error', purgeResult.error);
      return json({ error: purgeResult.error.message }, 500);
    }
    if (archiveResult.error) {
      logEdgeError('retention-cleanup', 'db_error', archiveResult.error);
      return json({ error: archiveResult.error.message }, 500);
    }

    return json({ ok: true, purged: purgeResult.data, archived: archiveResult.data });
  } catch (err) {
    logEdgeError('retention-cleanup', 'db_error', err);
    return json({ error: (err as Error).message }, 500);
  }
});
