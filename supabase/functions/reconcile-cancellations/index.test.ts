// Integration tests for supabase/functions/reconcile-cancellations/index.ts
// — the daily cron backstop that flips subscriptions.status to 'cancelled'
// once cancel_at has passed, independent of whether a Razorpay webhook ever
// confirms it (see that file's own header comment and
// docs/dev/BILLING_QA_MATRIX.md scenario 6).
//
// Run against a local `supabase start` instance ONLY:
//
//   supabase start
//   cd supabase/functions
//   RECONCILE_CRON_SECRET=test-cron-secret SUPABASE_SERVICE_ROLE_KEY=<local key> \
//     deno test --allow-net --allow-env reconcile-cancellations/index.test.ts
//
// `RECONCILE_CRON_SECRET` here MUST match the local Edge Function runtime's
// configured value, never a production secret.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getServiceClient, seedTestCompanyWithSubscription, cleanupTestCompany } from '../_shared/test_helpers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';
const RECONCILE_URL = `${SUPABASE_URL}/functions/v1/reconcile-cancellations`;
const CRON_SECRET = Deno.env.get('RECONCILE_CRON_SECRET') ?? 'test-cron-secret';

Deno.test('rejects a request without a valid X-Cron-Secret', async () => {
  const res = await fetch(RECONCILE_URL, { method: 'POST', headers: { 'X-Cron-Secret': 'wrong' } });
  assertEquals(res.status, 401);
});

Deno.test('flips a subscription past its cancel_at to cancelled', async () => {
  const { company, subscription } = await seedTestCompanyWithSubscription({
    cancel_at: new Date(Date.now() - 60_000).toISOString(), // already past
    status: 'active',
  });
  const client = getServiceClient();
  try {
    const res = await fetch(RECONCILE_URL, { method: 'POST', headers: { 'X-Cron-Secret': CRON_SECRET } });
    assertEquals(res.status, 200);

    const { data: after, error } = await client
      .from('subscriptions')
      .select('status')
      .eq('id', subscription.id)
      .single();
    if (error) throw error;
    assertEquals(after?.status, 'cancelled');
  } finally {
    await cleanupTestCompany(company.id);
  }
});

Deno.test('does not flip a subscription whose cancel_at is in the future', async () => {
  const { company, subscription } = await seedTestCompanyWithSubscription({
    cancel_at: new Date(Date.now() + 86_400_000).toISOString(),
    status: 'active',
  });
  const client = getServiceClient();
  try {
    const res = await fetch(RECONCILE_URL, { method: 'POST', headers: { 'X-Cron-Secret': CRON_SECRET } });
    assertEquals(res.status, 200);

    const { data: after, error } = await client
      .from('subscriptions')
      .select('status')
      .eq('id', subscription.id)
      .single();
    if (error) throw error;
    assertEquals(after?.status, 'active');
  } finally {
    await cleanupTestCompany(company.id);
  }
});
