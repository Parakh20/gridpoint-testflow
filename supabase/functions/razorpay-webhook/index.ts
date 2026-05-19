// Razorpay webhook handler — verifies signature, upserts subscription row.
//
// STATUS: scaffolded. Wire up after Razorpay account + plan creation.
//
// Required secrets (set via `supabase secrets set`):
//   RAZORPAY_WEBHOOK_SECRET   the secret you configured in Razorpay → Webhooks
//
// Razorpay sends webhooks with header `X-Razorpay-Signature: HMAC_SHA256(body, secret)`.
// We verify before doing anything. The Razorpay events we care about:
//   - subscription.activated
//   - subscription.charged
//   - subscription.completed
//   - subscription.cancelled
//   - subscription.paused / resumed
//
// The webhook payload contains `subscription.notes.company_id` (which we set
// when creating the subscription on Razorpay's side) so we can map back.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-razorpay-signature',
};

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  // Constant-time compare
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

function mapRazorpayStatus(razorpayStatus: string): string {
  // Razorpay subscription statuses → our subscriptions.status enum
  switch (razorpayStatus) {
    case 'created':
    case 'authenticated':
      return 'trialing';
    case 'active':
      return 'active';
    case 'pending':
    case 'halted':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'cancelled':
      return 'cancelled';
    case 'completed':
    case 'expired':
      return 'expired';
    default:
      return 'active';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const signature = req.headers.get('x-razorpay-signature') ?? '';
    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) return json({ error: 'Webhook secret not configured' }, 500);

    const rawBody = await req.text();
    const valid = await verifySignature(rawBody, signature, secret);
    if (!valid) return json({ error: 'Invalid signature' }, 401);

    const event = JSON.parse(rawBody);
    const eventType: string = event.event;
    const sub = event.payload?.subscription?.entity;

    if (!sub) return json({ ok: true, ignored: eventType });

    const companyId = sub.notes?.company_id;
    if (!companyId) {
      console.warn('Razorpay event missing notes.company_id', eventType, sub.id);
      return json({ ok: true, warning: 'missing company_id in notes' });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase.rpc('upsert_subscription', {
      _company_id: companyId,
      _provider_sub_id: sub.id,
      _provider_cust_id: sub.customer_id ?? null,
      _plan_id: sub.plan_id ?? null,
      _status: mapRazorpayStatus(sub.status),
      _period_start: sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null,
      _period_end:   sub.current_end   ? new Date(sub.current_end   * 1000).toISOString() : null,
      _seat_count: sub.quantity ?? 0,
      _raw: event,
    });

    if (error) {
      console.error('upsert_subscription error:', error.message);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, event: eventType, company_id: companyId });
  } catch (err) {
    console.error('razorpay-webhook error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
