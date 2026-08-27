// Razorpay webhook handler — verifies signature, dedupes by event id,
// dispatches subscription/payment/invoice events, upserts subscription
// or order rows accordingly.
//
// Required secrets (set via `supabase secrets set`):
//   RAZORPAY_WEBHOOK_SECRET   the secret configured in Razorpay → Webhooks
//   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET   for RazorpayBillingProvider (unused
//     directly by this handler today, constructed for parity with future
//     callers that need to make outbound Razorpay API calls from here)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RazorpayBillingProvider } from '../_shared/billing_provider.ts';
import { logEdgeError } from '../_shared/monitoring.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-razorpay-signature',
};

function mapRazorpayStatus(razorpayStatus: string): string {
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
    const provider = new RazorpayBillingProvider(
      Deno.env.get('RAZORPAY_KEY_ID') ?? '',
      Deno.env.get('RAZORPAY_KEY_SECRET') ?? '',
    );
    const valid = await provider.verifyWebhookSignature(rawBody, signature, secret);
    if (!valid) return json({ error: 'Invalid signature' }, 401);

    const event = JSON.parse(rawBody);
    const eventType: string = event.event;

    const sub = event.payload?.subscription?.entity;
    const payment = event.payload?.payment?.entity;
    const companyId: string | undefined = sub?.notes?.company_id ?? payment?.notes?.company_id;

    // Razorpay delivers the event id via the X-Razorpay-Event-Id header, not
    // a top-level `id` field in the body (that field doesn't exist in
    // Razorpay's payload). Headers.get() is case-insensitive. Fall back to a
    // payload-derived (not time-derived) key so retries of the same delivery
    // still collide instead of Date.now() guaranteeing uniqueness.
    const eventId = req.headers.get('x-razorpay-event-id')
      ?? `${eventType}:${event.created_at ?? ''}:${sub?.id ?? payment?.id ?? ''}`;

    if (!companyId) {
      console.warn('Razorpay event missing notes.company_id', eventType, sub?.id ?? payment?.id);
      return json({ ok: true, warning: 'missing company_id in notes' });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Idempotency gate: if we've already processed this exact provider
    // event id, no-op. Must run before any state-mutating RPC below.
    const { data: isNew, error: dedupeError } = await supabase.rpc('record_billing_event', {
      _provider: 'razorpay',
      _provider_event_id: eventId,
      _event_type: eventType,
      _company_id: companyId,
      _raw: event,
    });
    if (dedupeError) {
      logEdgeError('razorpay-webhook', 'webhook_failure', dedupeError, { step: 'record_billing_event', eventType, companyId });
      return json({ error: dedupeError.message }, 500);
    }
    if (!isNew) {
      return json({ ok: true, deduped: true, event: eventType });
    }

    // Subscription lifecycle events
    if (sub && eventType.startsWith('subscription.')) {
      const { error } = await supabase.rpc('upsert_subscription', {
        _company_id: companyId,
        _provider_sub_id: sub.id,
        _provider_cust_id: sub.customer_id ?? null,
        _provider_plan_id: sub.plan_id ?? null,
        _status: mapRazorpayStatus(sub.status),
        _period_start: sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null,
        _period_end:   sub.current_end   ? new Date(sub.current_end   * 1000).toISOString() : null,
        _seat_count: sub.quantity ?? 0,
        _raw: event,
        _event_created_at: event.created_at ? new Date(event.created_at * 1000).toISOString() : null,
      });
      if (error) {
        logEdgeError('razorpay-webhook', 'payment_failure', error, { step: 'upsert_subscription', eventType, companyId, subId: sub.id });
        // Compensating delete: undo the dedupe-gate insert so a legitimate
        // Razorpay retry isn't silently swallowed as "already processed" —
        // this event never actually completed.
        await supabase.from('billing_events').delete()
          .eq('provider', 'razorpay')
          .eq('provider_event_id', eventId);
        return json({ error: error.message }, 500);
      }
      return json({ ok: true, event: eventType, company_id: companyId });
    }

    // Payment events: subscription charges are already covered by
    // subscription.charged above (Razorpay fires both); a standalone
    // payment (implementation fee, add-on) is identified by notes.order_type
    // and written to `orders` instead.
    if (payment && (eventType === 'payment.captured' || eventType === 'payment.failed')) {
      const orderType = payment.notes?.order_type;
      if (orderType && ['implementation', 'addon', 'custom_development', 'training'].includes(orderType)) {
        const { error } = await supabase.rpc('upsert_order', {
          _company_id: companyId,
          _type: orderType,
          _amount: (payment.amount ?? 0) / 100, // paise -> rupees
          _currency: payment.currency ?? 'INR',
          _status: eventType === 'payment.captured' ? 'paid' : 'failed',
          _description: payment.description ?? null,
          _provider_payment_id: payment.id,
        });
        if (error) {
          logEdgeError('razorpay-webhook', 'payment_failure', error, { step: 'upsert_order', eventType, companyId, paymentId: payment.id });
          // Compensating delete: undo the dedupe-gate insert so a legitimate
          // Razorpay retry isn't silently swallowed as "already processed" —
          // this event never actually completed.
          await supabase.from('billing_events').delete()
            .eq('provider', 'razorpay')
            .eq('provider_event_id', eventId);
          return json({ error: error.message }, 500);
        }

        // Recording the order is only half of an add-on purchase — the
        // entitlement it was bought for has to be granted too, and only on a
        // captured payment. record_addon_purchase is idempotent on
        // provider_payment_id, so a redelivered webhook cannot grant twice.
        if (orderType === 'addon' && eventType === 'payment.captured') {
          const { error: addonError } = await supabase.rpc('record_addon_purchase', {
            _company_id: companyId,
            _addon_key: payment.notes?.addon_key ?? null,
            _quantity: Number(payment.notes?.quantity ?? 1),
            _provider_payment_id: payment.id,
            _amount_paid_inr: (payment.amount ?? 0) / 100,
          });
          if (addonError) {
            // The order row is already written and the money is captured, so
            // this is a paid-but-ungranted add-on: loud, and the dedupe gate
            // is released so Razorpay's retry can complete the grant.
            logEdgeError('razorpay-webhook', 'payment_failure', addonError, {
              step: 'record_addon_purchase', eventType, companyId, paymentId: payment.id,
              addonKey: payment.notes?.addon_key,
            });
            await supabase.from('billing_events').delete()
              .eq('provider', 'razorpay')
              .eq('provider_event_id', eventId);
            return json({ error: addonError.message }, 500);
          }
        }
      }
      return json({ ok: true, event: eventType, company_id: companyId });
    }

    // Everything else (invoice.* etc.) — acknowledged but not yet acted on;
    // Plan 4's billing settings page invoice list depends on Razorpay's
    // invoice API directly via BillingProvider.getInvoices, not a local
    // mirror table, so no write is needed here for invoice events.
    return json({ ok: true, ignored: eventType });
  } catch (err) {
    logEdgeError('razorpay-webhook', 'webhook_failure', err);
    return json({ error: (err as Error).message }, 500);
  }
});
