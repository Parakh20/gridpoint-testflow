// Unit tests for RazorpayBillingProvider.getInvoices — the invoice-history
// data path behind manage-subscription's `invoices` action.
//
// Unlike the other suites in this directory (entitlements.test.ts,
// razorpay-webhook/index.test.ts), this one needs neither `supabase start`
// nor network access: it stubs globalThis.fetch, because the thing under
// test is the request shape and the mapping of Razorpay's payload
// (paise, epoch seconds, nullable draft fields) onto BillingInvoice.
//
// Run: cd supabase/functions && deno test --allow-env _shared/billing_provider_invoices.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { RazorpayBillingProvider } from './billing_provider.ts';

function stubFetch(payload: unknown): { urls: string[]; restore: () => void } {
  const urls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request) => {
    urls.push(typeof input === 'string' ? input : input.toString());
    return Promise.resolve(
      new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  }) as typeof fetch;
  return { urls, restore: () => { globalThis.fetch = original; } };
}

const provider = () => new RazorpayBillingProvider('rzp_test_key', 'secret');

Deno.test('getInvoices maps paise to rupees and epoch seconds to ISO', async () => {
  const { restore } = stubFetch({
    items: [{
      id: 'inv_1', invoice_number: 'INV-0001', amount: 249900, currency: 'INR',
      status: 'paid', issued_at: 1_700_000_000, paid_at: 1_700_003_600,
      short_url: 'https://rzp.io/i/abc',
    }],
  });
  try {
    const [invoice] = await provider().getInvoices({ subscriptionId: 'sub_1' });
    assertEquals(invoice.providerInvoiceId, 'inv_1');
    assertEquals(invoice.invoiceNumber, 'INV-0001');
    assertEquals(invoice.amount, 2499);
    assertEquals(invoice.currency, 'INR');
    assertEquals(invoice.status, 'paid');
    assertEquals(invoice.issuedAt, new Date(1_700_000_000 * 1000).toISOString());
    assertEquals(invoice.paidAt, new Date(1_700_003_600 * 1000).toISOString());
    assertEquals(invoice.shortUrl, 'https://rzp.io/i/abc');
  } finally {
    restore();
  }
});

Deno.test('getInvoices tolerates draft invoices with null dates and no short_url', async () => {
  const { restore } = stubFetch({
    items: [{
      id: 'inv_draft', invoice_number: null, amount: 0, currency: 'INR',
      status: 'draft', issued_at: null, paid_at: null, short_url: null,
    }],
  });
  try {
    const [invoice] = await provider().getInvoices({ subscriptionId: 'sub_1' });
    assertEquals(invoice.issuedAt, null);
    assertEquals(invoice.paidAt, null);
    assertEquals(invoice.invoiceNumber, null);
    assertEquals(invoice.shortUrl, null);
  } finally {
    restore();
  }
});

Deno.test('getInvoices sorts newest first and puts drafts last', async () => {
  const { restore } = stubFetch({
    items: [
      { id: 'old', invoice_number: null, amount: 100, currency: 'INR', status: 'paid', issued_at: 1_600_000_000, paid_at: null, short_url: null },
      { id: 'draft', invoice_number: null, amount: 100, currency: 'INR', status: 'draft', issued_at: null, paid_at: null, short_url: null },
      { id: 'new', invoice_number: null, amount: 100, currency: 'INR', status: 'paid', issued_at: 1_700_000_000, paid_at: null, short_url: null },
    ],
  });
  try {
    const ids = (await provider().getInvoices({ subscriptionId: 'sub_1' })).map(i => i.providerInvoiceId);
    assertEquals(ids, ['new', 'old', 'draft']);
  } finally {
    restore();
  }
});

Deno.test('getInvoices filters by subscription and escapes the id', async () => {
  const { urls, restore } = stubFetch({ items: [] });
  try {
    await provider().getInvoices({ subscriptionId: 'sub/one', limit: 50 });
    assertEquals(urls.length, 1);
    assertEquals(
      urls[0],
      'https://api.razorpay.com/v1/invoices?subscription_id=sub%2Fone&count=50',
    );
  } finally {
    restore();
  }
});

// Regression guard for the live failure this suite originally missed:
// sub_TT8Tw2ktlofRVj is an active, paid subscription whose invoice exists but
// whose customer_id is null at Razorpay. Keying the query on the customer
// returned nothing; keying it on the subscription returns the invoice.
Deno.test('getInvoices prefers subscription over customer when both are given', async () => {
  const { urls, restore } = stubFetch({ items: [] });
  try {
    await provider().getInvoices({ subscriptionId: 'sub_1', customerId: 'cust_1' });
    assertEquals(urls[0].includes('subscription_id=sub_1'), true);
    assertEquals(urls[0].includes('customer_id'), false);
  } finally {
    restore();
  }
});

Deno.test('getInvoices falls back to the customer filter for one-off invoices', async () => {
  const { urls, restore } = stubFetch({ items: [] });
  try {
    await provider().getInvoices({ customerId: 'cust_1' });
    assertEquals(urls[0].includes('customer_id=cust_1'), true);
  } finally {
    restore();
  }
});

Deno.test('getInvoices makes no provider call when neither filter is set', async () => {
  const { urls, restore } = stubFetch({ items: [] });
  try {
    assertEquals(await provider().getInvoices({}), []);
    assertEquals(urls.length, 0);
  } finally {
    restore();
  }
});

Deno.test('getInvoices clamps the count to Razorpay\'s 1..100 range', async () => {
  const { urls, restore } = stubFetch({ items: [] });
  try {
    await provider().getInvoices({ subscriptionId: 'sub_1', limit: 5000 });
    await provider().getInvoices({ subscriptionId: 'sub_1', limit: 0 });
    assertEquals(urls[0].endsWith('count=100'), true);
    assertEquals(urls[1].endsWith('count=1'), true);
  } finally {
    restore();
  }
});

Deno.test('getInvoices returns an empty list when the provider omits items', async () => {
  const { restore } = stubFetch({});
  try {
    assertEquals(await provider().getInvoices({ subscriptionId: 'sub_1' }), []);
  } finally {
    restore();
  }
});

Deno.test('getSubscription surfaces the customer id the webhook payload omits', async () => {
  const { restore } = stubFetch({
    id: 'sub_1', status: 'active', current_start: 1_700_000_000, current_end: 1_702_000_000,
    customer_id: 'cust_9',
  });
  try {
    const sub = await provider().getSubscription('sub_1');
    assertEquals(sub.providerCustomerId, 'cust_9');
    assertEquals(sub.status, 'active');
  } finally {
    restore();
  }
});

Deno.test('getSubscription reports a missing customer id as null, not undefined', async () => {
  const { restore } = stubFetch({
    id: 'sub_1', status: 'active', current_start: null, current_end: null,
  });
  try {
    assertEquals((await provider().getSubscription('sub_1')).providerCustomerId, null);
  } finally {
    restore();
  }
});
