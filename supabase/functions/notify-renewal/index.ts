// Queues and sends renewal reminders for the prepaid billing model.
//
// There is no autopay: nothing is ever charged automatically, so a customer
// who is not reminded simply lapses and their workspace goes read-only. That
// makes this function the mechanism the whole model depends on, not a nicety.
//
// Reminders go out at 7, 3 and 1 days before the paid period ends, plus one
// on the day it lapses. Triggered by .github/workflows/notify-renewal.yml on
// a daily cron, gated by X-Cron-Secret — same pattern as notify-rework.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logEdgeError } from '../_shared/monitoring.ts';
import { resendFrom } from '../_shared/email.ts';

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

const BILLING_URL = 'https://app.optimustesting.com/settings/billing';

function subjectFor(daysBefore: number, companyName: string): string {
  if (daysBefore === 0) return `${companyName}: your TestFlow workspace is now read-only`;
  if (daysBefore === 1) return `${companyName}: TestFlow renews tomorrow — action needed`;
  return `${companyName}: TestFlow expires in ${daysBefore} days`;
}

function bodyFor(daysBefore: number, companyName: string, periodEnd: string, planName: string): string {
  const endDate = new Date(periodEnd).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const lead = daysBefore === 0
    ? `<p>Your ${escape(planName)} period ended on <strong>${escape(endDate)}</strong>, so <strong>${escape(companyName)}</strong> is now read-only.</p>
       <p>Your data is safe and still visible — you can view and export everything. Until you renew, no new projects, test records or users can be created.</p>`
    : `<p>Your ${escape(planName)} period for <strong>${escape(companyName)}</strong> ends on <strong>${escape(endDate)}</strong>${daysBefore === 1 ? ' — that is tomorrow' : ` — ${daysBefore} days from now`}.</p>
       <p>TestFlow does not charge automatically. If the period lapses, the workspace becomes read-only: your data stays intact and exportable, but your team cannot record new test results until you renew.</p>`;

  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#111">
${lead}
<p>Renewing takes a minute, and you can switch plan at the same time if your team has grown.</p>
<p><a href="${BILLING_URL}" style="display:inline-block;background:#3b82f6;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Renew now</a></p>
<p style="color:#666;font-size:13px">Renewing early never costs you days — the time you have already paid for is added on top.</p>
<p style="color:#666;font-size:13px">— TestFlow</p>
</body></html>`;
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

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return json({ error: 'Email notification is not configured' }, 500);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Queue first, then drain: the UNIQUE(company_id, period_end, days_before)
    // constraint means a cron that fires twice in a day cannot double-send.
    const { error: queueError } = await supabase.rpc('queue_renewal_reminders');
    if (queueError) {
      logEdgeError('notify-renewal', 'webhook_failure', queueError, { step: 'queue_renewal_reminders' });
      return json({ error: queueError.message }, 500);
    }

    const { data: pending, error } = await supabase
      .from('renewal_notifications')
      .select('id, company_id, period_end, days_before')
      .is('sent_at', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      logEdgeError('notify-renewal', 'webhook_failure', error, { step: 'select_pending' });
      return json({ error: error.message }, 500);
    }

    let sent = 0;
    let failed = 0;

    for (const row of pending ?? []) {
      try {
        const { data: company } = await supabase
          .from('companies').select('name').eq('id', row.company_id).maybeSingle();

        // Reminders go to SUPERADMINs: they are the only role that can pay.
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id, profiles!inner(email, is_active, company_id)')
          .eq('role', 'SUPERADMIN')
          .eq('profiles.company_id', row.company_id)
          .eq('profiles.is_active', true);

        const recipients = (admins ?? [])
          .map(a => (a as unknown as { profiles: { email: string } }).profiles?.email)
          .filter((e): e is string => !!e);

        if (recipients.length === 0) {
          // Nobody can act on this reminder. Mark it handled rather than
          // retrying forever, but record why.
          await supabase.from('renewal_notifications')
            .update({ sent_at: new Date().toISOString(), error: 'no active SUPERADMIN to notify' })
            .eq('id', row.id);
          continue;
        }

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plans(name)')
          .eq('company_id', row.company_id)
          .maybeSingle();
        const planName = (sub as unknown as { plans?: { name: string } })?.plans?.name ?? 'TestFlow';
        const companyName = company?.name ?? 'Your workspace';

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom(),
            to: recipients,
            subject: subjectFor(row.days_before, companyName),
            html: bodyFor(row.days_before, companyName, row.period_end, planName),
          }),
        });

        if (!res.ok) {
          const detail = await res.text();
          await supabase.from('renewal_notifications')
            .update({ error: `Resend ${res.status}: ${detail.slice(0, 300)}` })
            .eq('id', row.id);
          failed++;
          continue;
        }

        await supabase.from('renewal_notifications')
          .update({ sent_at: new Date().toISOString(), error: null })
          .eq('id', row.id);
        sent++;
      } catch (err) {
        logEdgeError('notify-renewal', 'webhook_failure', err, { notificationId: row.id });
        failed++;
      }
    }

    return json({ ok: true, sent, failed, considered: (pending ?? []).length });
  } catch (err) {
    logEdgeError('notify-renewal', 'webhook_failure', err);
    return json({ error: (err as Error).message }, 500);
  }
});
