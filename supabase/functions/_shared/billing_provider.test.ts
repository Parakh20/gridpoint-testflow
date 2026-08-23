// Unit tests for isAlreadyCancelledError() in ./billing_provider.ts — the
// classifier manage-subscription/index.ts's cancel action uses to decide
// whether a Razorpay cancelSubscription() failure is a genuine failure or
// an idempotent "this subscription is already cancelled / already scheduled
// to be cancelled" response that should be treated as success.
//
// This tests a pure function — no network, no Docker, no `supabase start`
// required. Run with:
//
//   cd supabase/functions
//   deno test --allow-net --allow-env _shared/billing_provider.test.ts
//
// (--allow-net/--allow-env are harmless no-ops here since this file makes no
// network calls and reads no env vars; they're included so this command is
// consistent with how every other suite in this repo is invoked, including
// in CI — see .github/workflows/supabase.yml.)
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { isAlreadyCancelledError, RazorpayBillingProvider, razorpayKeyMode } from './billing_provider.ts';

Deno.test('matches the terminal "already been cancelled" wording', () => {
  const message = 'Razorpay API error 400: {"error":{"description":"The subscription has already been cancelled"}}';
  assertEquals(isAlreadyCancelledError(message), true);
});

Deno.test('matches the shorter "already cancelled" wording', () => {
  const message = 'Razorpay API error 400: {"error":{"description":"Subscription already cancelled"}}';
  assertEquals(isAlreadyCancelledError(message), true);
});

Deno.test('matches the cycle-end-scheduled wording produced by a re-cancel of a cancel_at_cycle_end:1 subscription', () => {
  // This is the realistic double-submit case: cancelSubscription(id, true)
  // sends cancel_at_cycle_end:1, which leaves the subscription `active`
  // with cancellation scheduled rather than moving it to a terminal
  // `cancelled` status immediately — so a retried/duplicate cancel call
  // realistically gets this wording back, not the terminal-cancelled one.
  const message = 'Razorpay API error 400: {"error":{"description":"Subscription is already scheduled to be cancelled at the end of the current billing cycle"}}';
  assertEquals(isAlreadyCancelledError(message), true);
});

Deno.test('matches a literal cancel_at_cycle_end reference in the error body', () => {
  const message = 'Razorpay API error 400: {"error":{"description":"cancel_at_cycle_end already set for this subscription"}}';
  assertEquals(isAlreadyCancelledError(message), true);
});

Deno.test('does NOT match an unrelated 4xx error (bad subscription id)', () => {
  const message = 'Razorpay API error 400: {"error":{"description":"The id provided does not exist"}}';
  assertEquals(isAlreadyCancelledError(message), false);
});

Deno.test('does NOT match an unrelated 4xx error (auth failure)', () => {
  const message = 'Razorpay API error 401: {"error":{"description":"Authentication failed"}}';
  assertEquals(isAlreadyCancelledError(message), false);
});

Deno.test('does NOT match a generic 5xx failure', () => {
  const message = 'Razorpay API error 500: {"error":{"description":"Internal server error"}}';
  assertEquals(isAlreadyCancelledError(message), false);
});

Deno.test('does NOT match a validation-rejection error that echoes cancel_at_cycle_end as a field name without "already"', () => {
  // Razorpay can reject the cancel call outright (e.g. the field isn't
  // accepted in this context) and echo the field name back in the error
  // body. That is Razorpay REFUSING to cancel — the opposite of idempotent
  // success — so a bare `cancel_at_cycle_end` mention must never qualify on
  // its own; "already" must also be present.
  const message = 'Razorpay API error 400: {"error":{"code":"BAD_REQUEST_ERROR","description":"cancel_at_cycle_end is/are not required and should not be sent","field":"cancel_at_cycle_end"}}';
  assertEquals(isAlreadyCancelledError(message), false);
});

// ─── createPlan / razorpayKeyMode ────────────────────────────────────────────
// createPlan is what makes a price change possible from the admin panel:
// Razorpay plan amounts are immutable, so a new price always means a NEW plan.
// What matters here is the request shape (rupees -> integer paise, our
// 'annual' -> Razorpay's 'yearly') — get that wrong and the operator creates a
// plan that charges the wrong amount, which is a real-money bug.
//
// Stubs globalThis.fetch, same posture as billing_provider_invoices.test.ts —
// no network, no `supabase start`.

function stubCreatePlanFetch(): { bodies: unknown[]; urls: string[]; restore: () => void } {
  const bodies: unknown[] = [];
  const urls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    urls.push(typeof input === 'string' ? input : input.toString());
    bodies.push(JSON.parse(String(init?.body ?? '{}')));
    return Promise.resolve(
      new Response(JSON.stringify({ id: 'plan_stub' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  }) as typeof fetch;
  return { bodies, urls, restore: () => { globalThis.fetch = original; } };
}

Deno.test('createPlan sends rupees as integer paise and maps annual to yearly', async () => {
  const { bodies, urls, restore } = stubCreatePlanFetch();
  try {
    const provider = new RazorpayBillingProvider('rzp_test_key', 'secret');
    const res = await provider.createPlan({
      name: 'Starter (annual)', interval: 'annual', amountInr: 249999, planSlug: 'starter',
    });
    assertEquals(res.providerPlanId, 'plan_stub');
    assertEquals(urls[0], 'https://api.razorpay.com/v1/plans');
    const body = bodies[0] as Record<string, any>;
    assertEquals(body.period, 'yearly');
    assertEquals(body.interval, 1);
    assertEquals(body.item.amount, 24_999_900);
    assertEquals(body.item.currency, 'INR');
    assertEquals(body.notes.plan_slug, 'starter');
  } finally {
    restore();
  }
});

Deno.test('createPlan rounds a fractional rupee price rather than truncating it', async () => {
  const { bodies, restore } = stubCreatePlanFetch();
  try {
    const provider = new RazorpayBillingProvider('rzp_test_key', 'secret');
    await provider.createPlan({ name: 'x', interval: 'monthly', amountInr: 24999.995, planSlug: 'x' });
    assertEquals((bodies[0] as Record<string, any>).item.amount, 2_500_000);
    assertEquals((bodies[0] as Record<string, any>).period, 'monthly');
  } finally {
    restore();
  }
});

Deno.test('createPlan refuses a non-positive amount before calling Razorpay', async () => {
  const { urls, restore } = stubCreatePlanFetch();
  try {
    const provider = new RazorpayBillingProvider('rzp_test_key', 'secret');
    let threw = false;
    try {
      await provider.createPlan({ name: 'x', interval: 'monthly', amountInr: 0, planSlug: 'x' });
    } catch {
      threw = true;
    }
    assertEquals(threw, true);
    assertEquals(urls.length, 0);
  } finally {
    restore();
  }
});

Deno.test('razorpayKeyMode distinguishes live from test keys', () => {
  assertEquals(razorpayKeyMode('rzp_live_abc123'), 'live');
  assertEquals(razorpayKeyMode('rzp_test_abc123'), 'test');
  // Anything unrecognised is treated as test — the conservative direction:
  // it flags a mismatch against live-mode mappings rather than silently
  // asserting a key is live.
  assertEquals(razorpayKeyMode('something-else'), 'test');
});
