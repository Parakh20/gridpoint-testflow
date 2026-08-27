// Unit tests for RazorpayBillingProvider.createOrder — the one-time-charge
// path behind manage-subscription's `purchase_addon` action.
//
// Pure, like billing_provider_invoices.test.ts: stubs globalThis.fetch, needs
// neither `supabase start` nor network. What matters here is the request body,
// because a wrong amount is a wrong charge and the notes are the only thing
// that survives the trip out to the customer's browser and back on the webhook.
//
// Run: cd supabase/functions && deno test --allow-env _shared/billing_provider_orders.test.ts
import { assertEquals, assertRejects, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { RazorpayBillingProvider } from './billing_provider.ts';

type Captured = { url: string; body: Record<string, unknown> };

function stubFetch(payload: unknown, status = 200): { calls: Captured[]; restore: () => void } {
  const calls: Captured[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: typeof input === 'string' ? input : input.toString(),
      body: init?.body ? JSON.parse(init.body as string) : {},
    });
    return Promise.resolve(
      new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } }),
    );
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

const provider = () => new RazorpayBillingProvider('rzp_test_key', 'secret');
const COMPANY = '2ace103c-5ba6-4ad8-8093-4ceab51e366c';

Deno.test('createOrder sends rupees as integer paise', async () => {
  const { calls, restore } = stubFetch({ id: 'order_1', amount: 249900 });
  try {
    const result = await provider().createOrder({
      amountInr: 2499,
      companyId: COMPANY,
      notes: { order_type: 'addon', addon_key: 'extra_users', quantity: '1' },
    });
    assertEquals(result.providerOrderId, 'order_1');
    assertEquals(result.amountPaise, 249900);
    assertStringIncludes(calls[0].url, '/orders');
    assertEquals(calls[0].body.amount, 249900);
    assertEquals(calls[0].body.currency, 'INR');
  } finally {
    restore();
  }
});

Deno.test('createOrder rounds fractional rupees rather than truncating', async () => {
  const { calls, restore } = stubFetch({ id: 'order_2', amount: 249999 });
  try {
    // 2499.995 must not silently become 249999 paise by truncation.
    await provider().createOrder({ amountInr: 2499.995, companyId: COMPANY, notes: {} });
    assertEquals(calls[0].body.amount, 250000);
  } finally {
    restore();
  }
});

Deno.test('createOrder carries the fulfilment notes and always stamps company_id', async () => {
  const { calls, restore } = stubFetch({ id: 'order_3', amount: 100 });
  try {
    await provider().createOrder({
      amountInr: 1,
      companyId: COMPANY,
      notes: { order_type: 'addon', addon_key: 'sso', quantity: '1' },
    });
    assertEquals(calls[0].body.notes, {
      order_type: 'addon',
      addon_key: 'sso',
      quantity: '1',
      company_id: COMPANY,
    });
  } finally {
    restore();
  }
});

Deno.test('createOrder truncates the receipt to Razorpay\'s 40-char cap', async () => {
  const { calls, restore } = stubFetch({ id: 'order_4', amount: 100 });
  try {
    await provider().createOrder({
      amountInr: 1,
      companyId: COMPANY,
      notes: {},
      receipt: 'addon-extra_users-with-a-very-long-suffix-that-overflows',
    });
    assertEquals((calls[0].body.receipt as string).length, 40);
  } finally {
    restore();
  }
});

Deno.test('createOrder refuses a non-positive amount before calling Razorpay', async () => {
  const { calls, restore } = stubFetch({ id: 'order_5', amount: 0 });
  try {
    await assertRejects(
      () => provider().createOrder({ amountInr: 0, companyId: COMPANY, notes: {} }),
      Error,
      'non-positive',
    );
    assertEquals(calls.length, 0);
  } finally {
    restore();
  }
});

Deno.test('createOrder surfaces a Razorpay error rather than returning a bad id', async () => {
  const { restore } = stubFetch({ error: { description: 'Order amount is invalid' } }, 400);
  try {
    await assertRejects(
      () => provider().createOrder({ amountInr: 2499, companyId: COMPANY, notes: {} }),
      Error,
      'Razorpay API error 400',
    );
  } finally {
    restore();
  }
});
