// Integration tests for supabase/functions/razorpay-webhook/index.ts.
// Run against a local `supabase start` instance ONLY:
//
//   supabase start
//   cd supabase/functions
//   RAZORPAY_WEBHOOK_SECRET=test-secret SUPABASE_SERVICE_ROLE_KEY=<local key> \
//     deno test --allow-net --allow-env razorpay-webhook/index.test.ts
//
// `RAZORPAY_WEBHOOK_SECRET` here MUST match whatever the local Edge Function
// runtime has configured for that env var (supabase/.env for local dev), or
// every "valid signature" test will fail for the wrong reason (misconfigured
// local secret, not a real handler bug).
//
// Payload shape verified against the real handler
// (supabase/functions/razorpay-webhook/index.ts, read in full before writing
// this file) rather than assumed from the task brief's sketch:
//   - event.event                                  (top-level string, e.g. "subscription.charged")
//   - event.payload.subscription.entity             (sub object; .id, .status, .customer_id,
//                                                     .plan_id, .current_start/.current_end in
//                                                     UNIX SECONDS, .quantity, .notes.company_id)
//   - event.payload.payment.entity                  (payment object; not exercised by these tests)
//   - event.created_at                               TOP-LEVEL unix-seconds field (not nested under
//                                                     payload) — used both as the ordering-guard
//                                                     timestamp (_event_created_at) AND as part of the
//                                                     event-id fallback when X-Razorpay-Event-Id is
//                                                     absent. These tests always send the header
//                                                     explicitly, so the fallback path itself isn't
//                                                     exercised here.
//   - the event id comes from the `X-Razorpay-Event-Id` REQUEST HEADER, never
//     from a body field — Razorpay's payload has no top-level `id`.
//   - company routing: `sub.notes.company_id` (fallback `payment.notes.company_id`)
//     — a payload without `notes.company_id` is acknowledged with a warning,
//     not processed, so every test payload below sets it explicitly.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  getServiceClient,
  signRazorpayPayload,
  seedTestCompanyWithSubscription,
  cleanupTestCompany,
} from '../_shared/test_helpers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/razorpay-webhook`;
const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? 'test-secret';

async function postWebhook(payload: Record<string, unknown>, eventId: string) {
  const raw = JSON.stringify(payload);
  const signature = await signRazorpayPayload(raw, WEBHOOK_SECRET);
  return fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': signature,
      'X-Razorpay-Event-Id': eventId,
    },
    body: raw,
  });
}

function subscriptionChargedPayload(params: {
  companyId: string;
  subscriptionId: string;
  status: string;
  currentStartSec: number;
  createdAtSec: number;
}) {
  return {
    event: 'subscription.charged',
    created_at: params.createdAtSec,
    payload: {
      subscription: {
        entity: {
          id: params.subscriptionId,
          status: params.status,
          current_start: params.currentStartSec,
          notes: { company_id: params.companyId },
        },
      },
    },
  };
}

Deno.test('rejects a payload with an invalid HMAC signature', async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': 'deadbeef',
      'X-Razorpay-Event-Id': 'evt_bad',
    },
    body: JSON.stringify({ event: 'subscription.charged' }),
  });
  assertEquals(res.status, 401);
});

Deno.test('deduplicates a retried event with the same X-Razorpay-Event-Id', async () => {
  const { company, subscription } = await seedTestCompanyWithSubscription();
  try {
    const eventId = `evt_${crypto.randomUUID()}`;
    const nowSec = Math.floor(Date.now() / 1000);
    const payload = subscriptionChargedPayload({
      companyId: company.id,
      subscriptionId: subscription.provider_subscription_id ?? `sub_${crypto.randomUUID()}`,
      status: 'active',
      currentStartSec: nowSec,
      createdAtSec: nowSec,
    });

    const first = await postWebhook(payload, eventId);
    assertEquals(first.status, 200);
    const firstBody = await first.json();
    assertEquals(firstBody.deduped, undefined);

    // Exact same event id, exact same body — simulates Razorpay retrying
    // delivery of the same webhook.
    const second = await postWebhook(payload, eventId);
    assertEquals(second.status, 200);
    const secondBody = await second.json();
    assertEquals(secondBody.deduped, true);
  } finally {
    await cleanupTestCompany(company.id);
  }
});

Deno.test('a subscription.* event is acknowledged but changes nothing', async () => {
  // Billing moved to prepaid periods (20260827000004): there is no Razorpay
  // subscription to mirror, so these events must be acknowledged rather than
  // rejected — a straggler from the autopay era should not be retried
  // forever — while leaving the row untouched.
  const { company, subscription } = await seedTestCompanyWithSubscription({ status: 'active' });
  const client = getServiceClient();
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const res = await postWebhook(
      subscriptionChargedPayload({
        companyId: company.id,
        subscriptionId: subscription.provider_subscription_id ?? `sub_${crypto.randomUUID()}`,
        status: 'past_due',
        currentStartSec: nowSec,
        createdAtSec: nowSec,
      }),
      `evt_sub_ignored_${crypto.randomUUID()}`
    );
    assertEquals(res.status, 200);

    const { data: finalSub, error } = await client
      .from('subscriptions')
      .select('status')
      .eq('id', subscription.id)
      .single();
    if (error) throw error;
    // 'past_due' from the payload must NOT have been applied.
    assertEquals(finalSub?.status, 'active');
  } finally {
    await cleanupTestCompany(company.id);
  }
});

Deno.test('a captured plan_renewal payment extends the paid period exactly once', async () => {
  const { company, subscription } = await seedTestCompanyWithSubscription();
  const client = getServiceClient();
  try {
    const { data: plan } = await client
      .from('plans').select('id').eq('slug', 'starter').single();

    const paymentId = `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const renewalPayload = {
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: paymentId,
            amount: 2499900,
            currency: 'INR',
            notes: {
              company_id: company.id,
              order_type: 'plan_renewal',
              plan_slug: 'starter',
              billing_interval: 'monthly',
            },
          },
        },
      },
    };

    const first = await postWebhook(renewalPayload, `evt_renew_${crypto.randomUUID()}`);
    assertEquals(first.status, 200);

    const { data: afterFirst, error: firstErr } = await client
      .from('subscriptions')
      .select('current_period_end, plan_id, last_renewal_payment_id')
      .eq('id', subscription.id)
      .single();
    if (firstErr) throw firstErr;
    assertEquals(afterFirst?.plan_id, plan?.id);
    assertEquals(afterFirst?.last_renewal_payment_id, paymentId);

    // Razorpay delivers at least once. The SAME payment redelivered under a
    // NEW event id clears the dedupe gate, so apply_plan_period's own
    // idempotency is the only thing standing between a retry and a free
    // period.
    const replay = await postWebhook(renewalPayload, `evt_renew_replay_${crypto.randomUUID()}`);
    assertEquals(replay.status, 200);

    const { data: afterReplay, error: replayErr } = await client
      .from('subscriptions')
      .select('current_period_end')
      .eq('id', subscription.id)
      .single();
    if (replayErr) throw replayErr;
    assertEquals(afterReplay?.current_period_end, afterFirst?.current_period_end);
  } finally {
    await cleanupTestCompany(company.id);
  }
});
