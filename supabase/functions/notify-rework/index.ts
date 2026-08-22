// Drains rework_notifications (queued by trg_queue_rework_notification when a
// test_task flips to REWORK) and emails the assigned engineer via Resend.
// Triggered by .github/workflows/notify-rework.yml on a periodic cron, not by
// a user — gated by X-Cron-Secret, same pattern as reconcile-cancellations.
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

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return json({ error: 'Email notification is not configured' }, 500);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: pending, error } = await supabase.rpc('get_pending_rework_notifications', { _limit: 50 });
    if (error) {
      logEdgeError('notify-rework', 'db_error', error);
      return json({ error: error.message }, 500);
    }

    let sent = 0;
    let failed = 0;

    for (const row of pending ?? []) {
      const html = `
        <p>Hi ${escape(row.engineer_name ?? 'there')},</p>
        <p>Your submission for <strong>${escape(row.equipment_label)}</strong>
        on project <strong>${escape(row.project_name)}</strong> was sent back for rework.</p>
        <p>Please review the feedback and resubmit in TestFlow.</p>
      `;

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TestFlow <onboarding@resend.dev>',
          to: [row.engineer_email],
          subject: `Rework requested — ${row.equipment_label}`,
          html,
        }),
      });

      if (resendRes.ok) {
        await supabase.rpc('mark_rework_notification_sent', { _notification_id: row.notification_id });
        sent++;
      } else {
        failed++;
        logEdgeError('notify-rework', 'api_error', await resendRes.text());
      }
    }

    return json({ ok: true, sent, failed });
  } catch (err) {
    logEdgeError('notify-rework', 'db_error', err);
    return json({ error: (err as Error).message }, 500);
  }
});
