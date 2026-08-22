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
import { isAlreadyCancelledError } from './billing_provider.ts';

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
