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
    const [invoice] = await provider().getInvoices('cust_1');
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
    const [invoice] = await provider().getInvoices('cust_1');
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
    const ids = (await provider().getInvoices('cust_1')).map(i => i.providerInvoiceId);
    assertEquals(ids, ['new', 'old', 'draft']);
  } finally {
    restore();
  }
});

Deno.test('getInvoices requests an explicit count and escapes the customer id', async () => {
  const { urls, restore } = stubFetch({ items: [] });
  try {
    await provider().getInvoices('cust/one', 50);
    assertEquals(urls.length, 1);
    assertEquals(
      urls[0],
      'https://api.razorpay.com/v1/invoices?customer_id=cust%2Fone&count=50',
    );
  } finally {
    restore();
  }
});

Deno.test('getInvoices clamps the count to Razorpay\'s 1..100 range', async () => {
  const { urls, restore } = stubFetch({ items: [] });
  try {
    await provider().getInvoices('cust_1', 5000);
    await provider().getInvoices('cust_1', 0);
    assertEquals(urls[0].endsWith('count=100'), true);
    assertEquals(urls[1].endsWith('count=1'), true);
  } finally {
    restore();
  }
});

Deno.test('getInvoices returns an empty list when the provider omits items', async () => {
  const { restore } = stubFetch({});
  try {
    assertEquals(await provider().getInvoices('cust_1'), []);
  } finally {
    restore();
  }
});
