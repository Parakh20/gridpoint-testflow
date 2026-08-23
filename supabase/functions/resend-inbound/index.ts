// Resend inbound-email webhook — receives `email.received` deliveries for
// support@optimustesting.com and stores them in `inbound_emails` so the
// platform admin panel can show a two-way thread per company alongside what
// was sent (email_log).
//
// Required secret (set via `supabase secrets set`):
//   RESEND_WEBHOOK_SECRET   the signing secret shown in Resend → Webhooks
//                           (starts with `whsec_`)
//
// Needs `verify_jwt = false` in supabase/config.toml — Resend has no Supabase
// JWT, and without that entry the gateway rejects the request before this
// handler runs.
//
// Endpoint to paste into Resend → Webhooks → Add Webhook (event
// `email.received`):
//   https://<project-ref>.supabase.co/functions/v1/resend-inbound

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logEdgeError } from '../_shared/monitoring.ts';
import { readSvixHeaders, verifySvixSignature } from '../_shared/svix.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, svix-id, svix-timestamp, svix-signature, webhook-id, webhook-timestamp, webhook-signature',
};

/** Resend gives `from` either as a plain address or as `Name <addr@host>`. */
function parseAddress(raw: unknown): { email: string; name: string | null } {
  if (typeof raw !== 'string') return { email: '', name: null };
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].replace(/^"|"$/g, '').trim();
    return { email: match[2].trim(), name: name || null };
  }
  return { email: raw.trim(), name: null };
}

function firstAddress(raw: unknown): string | null {
  if (Array.isArray(raw)) return raw.length ? parseAddress(raw[0]).email : null;
  const parsed = parseAddress(raw);
  return parsed.email || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (!secret) {
      logEdgeError('resend-inbound', 'api_error', 'RESEND_WEBHOOK_SECRET is not configured');
      return json({ error: 'Webhook secret not configured' }, 500);
    }

    const rawBody = await req.text();
    const headers = readSvixHeaders(req);
    const failure = await verifySvixSignature(rawBody, headers, secret);
    if (failure) {
      // Log the reason, return a bare 401 — telling a caller which check
      // failed helps only an attacker.
      logEdgeError('resend-inbound', 'api_error', `signature rejected: ${failure}`);
      return json({ error: 'Invalid signature' }, 401);
    }

    let event: Record<string, any>;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    // Only inbound mail. Delivery/bounce/complaint events may arrive on the
    // same endpoint if the operator subscribed to them; acknowledge and drop
    // rather than 4xx, or Resend will retry them forever.
    if (event.type !== 'email.received') {
      return json({ ok: true, ignored: event.type ?? 'unknown' });
    }

    const data = (event.data ?? {}) as Record<string, any>;
    const from = parseAddress(data.from);
    if (!from.email) return json({ error: 'Event has no sender address' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotency key is the Svix delivery id — Resend retries, and a retry
    // must not create a second copy of the same message. Same ledger shape as
    // record_billing_event / billing_events.
    const eventId = headers.id ?? (typeof data.email_id === 'string' ? data.email_id : null);
    if (!eventId) return json({ error: 'Delivery has no id to dedupe on' }, 400);

    // Attachments arrive as metadata (id/filename/content_type/size), never as
    // bytes — stored as-is; fetching content is a separate Resend API call.
    const attachments = Array.isArray(data.attachments) ? data.attachments : [];

    const { data: isNew, error } = await supabase.rpc('record_inbound_email', {
      _provider_event_id: eventId,
      _from_email: from.email,
      _from_name: from.name,
      _to_email: firstAddress(data.to),
      _subject: typeof data.subject === 'string' ? data.subject : null,
      _text_body: typeof data.text === 'string' ? data.text : null,
      _html_body: typeof data.html === 'string' ? data.html : null,
      _attachments: attachments,
      _raw: event,
    });
    if (error) {
      logEdgeError('resend-inbound', 'db_error', error);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, stored: isNew === true, duplicate: isNew === false });
  } catch (err) {
    logEdgeError('resend-inbound', 'api_error', err);
    return json({ error: (err as Error).message }, 500);
  }
});
