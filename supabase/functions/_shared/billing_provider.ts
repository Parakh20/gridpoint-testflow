// BillingProvider: a thin seam over the payment provider so subscription
// lifecycle logic (this file's callers) never talks to a provider SDK
// directly. Implemented for Razorpay only — this codebase has already
// committed to Razorpay (see razorpay-webhook), so this is NOT a
// speculative multi-provider abstraction, just a named interface for the
// one real implementation, per YAGNI.

export interface BillingCustomer {
  providerCustomerId: string;
}

export interface BillingSubscription {
  providerSubscriptionId: string;
  /**
   * Present on REST reads (GET /subscriptions/:id) but NOT on Razorpay's
   * subscription.* webhook payloads, where the entity carries
   * customer_id: null — which is why subscriptions.provider_customer_id has
   * to be backfilled from a read rather than trusted from a webhook.
   */
  providerCustomerId?: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface BillingInvoice {
  providerInvoiceId: string;
  /** Human-facing invoice number (Razorpay `invoice_number`), when the provider assigned one. */
  invoiceNumber: string | null;
  /** Major currency units (rupees), converted from the provider's minor units. */
  amount: number;
  currency: string;
  status: string;
  /** Null for draft invoices, which the provider has not issued yet. */
  issuedAt: string | null;
  paidAt: string | null;
  /** Provider-hosted invoice page — the download/receipt link shown to the customer. */
  shortUrl: string | null;
}

export interface InvoiceFilter {
  subscriptionId?: string | null;
  customerId?: string | null;
  limit?: number;
}

export interface BillingProvider {
  createCustomer(params: { name: string; email: string; companyId: string }): Promise<BillingCustomer>;
  createSubscription(params: {
    providerCustomerId: string;
    providerPlanId: string;
    companyId: string;
    seatCount: number;
  }): Promise<BillingSubscription>;
  cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  // scheduleChangeAt: 'now' applies the plan change (and Razorpay's proration
  // for the remainder of the cycle) immediately — used for upgrades, where
  // the customer expects expanded access and the prorated charge right away.
  // 'cycle_end' (the default, preserving this method's original behavior)
  // defers the change to the next billing cycle — intended for downgrades,
  // not yet wired to any caller as of this comment (see manage-subscription's
  // `downgrade` action TODO).
  changeSubscription(
    providerSubscriptionId: string,
    newProviderPlanId: string,
    scheduleChangeAt?: 'now' | 'cycle_end'
  ): Promise<BillingSubscription>;
  getSubscription(providerSubscriptionId: string): Promise<BillingSubscription>;
  /**
   * Razorpay's invoice list can be filtered by subscription or by customer.
   * Prefer `subscriptionId`: subscriptions we create are not reliably linked
   * to a customer at the provider, so `customerId` can be null on a perfectly
   * healthy paid subscription — see getInvoices' implementation note.
   */
  getInvoices(filter: InvoiceFilter): Promise<BillingInvoice[]>;
  /**
   * Create a new provider-side plan. Razorpay plan amounts are IMMUTABLE, so
   * a price change is always "create a new plan and remap", never an edit —
   * this is what makes that possible from the admin panel instead of a
   * migration. Plans also cannot be deleted at Razorpay; an unmapped one is
   * simply orphaned, which is harmless but permanent.
   */
  createPlan(params: {
    name: string;
    interval: 'monthly' | 'annual';
    amountInr: number;
    planSlug: string;
  }): Promise<{ providerPlanId: string }>;
  verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean>;
  /**
   * One-time charge, as opposed to a recurring subscription. `notes` is the
   * only channel that survives the round trip out to the customer's browser
   * and back in on the webhook, so everything needed to fulfil the purchase
   * has to travel there.
   */
  createOrder(params: {
    amountInr: number;
    companyId: string;
    notes: Record<string, string>;
    receipt?: string;
  }): Promise<{ providerOrderId: string; amountPaise: number }>;
}

/** 'rzp_live_...' vs 'rzp_test_...' — which Razorpay environment a key targets. */
export function razorpayKeyMode(keyId: string): 'test' | 'live' {
  return keyId.startsWith('rzp_live') ? 'live' : 'test';
}

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

export class RazorpayBillingProvider implements BillingProvider {
  constructor(private keyId: string, private keySecret: string) {}

  private authHeader(): string {
    return 'Basic ' + btoa(`${this.keyId}:${this.keySecret}`);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${RAZORPAY_API_BASE}${path}`, {
      ...init,
      headers: {
        'Authorization': this.authHeader(),
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Razorpay API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  async createCustomer(params: { name: string; email: string; companyId: string }): Promise<BillingCustomer> {
    const data = await this.request<{ id: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        email: params.email,
        notes: { company_id: params.companyId },
        // Without this, Razorpay 400s ("Customer already exists for the
        // merchant") instead of returning the existing customer — confirmed
        // via a live call retried after an earlier createSubscription
        // failure (subscribe's manage-subscription action doesn't persist
        // provider_customer_id locally until the webhook confirms checkout,
        // so any retry before that point re-hits createCustomer with the
        // same email). fail_existing: '0' makes this call idempotent.
        fail_existing: '0',
      }),
    });
    return { providerCustomerId: data.id };
  }

  async createSubscription(params: {
    providerCustomerId: string;
    providerPlanId: string;
    companyId: string;
    seatCount: number;
  }): Promise<BillingSubscription> {
    const data = await this.request<{
      id: string; status: string; current_start: number | null; current_end: number | null;
    }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: params.providerPlanId,
        // Link the subscription to the customer we just created. Omitting
        // this is what left sub_TT8Tw2ktlofRVj (and its invoice) with
        // customer_id null at Razorpay — the caller created a customer, got
        // an id back, and dropped it, so nothing tied the two together.
        // Razorpay will not backfill this later and the field is immutable
        // once the subscription exists, so subscriptions created before this
        // fix stay unlinked forever; getInvoices keys on subscription_id
        // precisely so that history still works for them.
        customer_id: params.providerCustomerId,
        customer_notify: 1,
        quantity: params.seatCount,
        notes: { company_id: params.companyId },
        // Razorpay rejects subscription creation without total_count unless
        // "perpetual subscriptions" is enabled on the account (a Standard-plan
        // feature, off by default — confirmed via a live 400 against this
        // account: "Perpetual subscriptions are not enabled ... total_count is
        // required"). 100 cycles is the standard "effectively until cancelled"
        // workaround (100 months ≈ 8 years for a monthly plan) — real
        // cancellation still goes through cancelSubscription(), this is just
        // satisfying Razorpay's required field, not an actual expiry we expect
        // to hit.
        total_count: 100,
      }),
    });
    return {
      providerSubscriptionId: data.id,
      status: data.status,
      currentPeriodStart: data.current_start ? new Date(data.current_start * 1000).toISOString() : null,
      currentPeriodEnd: data.current_end ? new Date(data.current_end * 1000).toISOString() : null,
    };
  }

  async cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    await this.request(`/subscriptions/${providerSubscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancel_at_cycle_end: atPeriodEnd ? 1 : 0 }),
    });
  }

  async changeSubscription(
    providerSubscriptionId: string,
    newProviderPlanId: string,
    scheduleChangeAt: 'now' | 'cycle_end' = 'cycle_end'
  ): Promise<BillingSubscription> {
    const data = await this.request<{
      id: string; status: string; current_start: number | null; current_end: number | null;
    }>(`/subscriptions/${providerSubscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ plan_id: newProviderPlanId, schedule_change_at: scheduleChangeAt }),
    });
    return {
      providerSubscriptionId: data.id,
      status: data.status,
      currentPeriodStart: data.current_start ? new Date(data.current_start * 1000).toISOString() : null,
      currentPeriodEnd: data.current_end ? new Date(data.current_end * 1000).toISOString() : null,
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<BillingSubscription> {
    const data = await this.request<{
      id: string; status: string; current_start: number | null; current_end: number | null;
      customer_id?: string | null;
    }>(`/subscriptions/${providerSubscriptionId}`);
    return {
      providerSubscriptionId: data.id,
      providerCustomerId: data.customer_id ?? null,
      status: data.status,
      currentPeriodStart: data.current_start ? new Date(data.current_start * 1000).toISOString() : null,
      currentPeriodEnd: data.current_end ? new Date(data.current_end * 1000).toISOString() : null,
    };
  }

  async getInvoices(filter: InvoiceFilter): Promise<BillingInvoice[]> {
    // Filter by subscription first. Razorpay only links an invoice to a
    // customer when the subscription itself was created with a customer_id,
    // and ours were not — verified live on 2026-08-23 against
    // sub_TT8Tw2ktlofRVj: the subscription is active with paid_count 1, its
    // one invoice (inv_TT8TwiHBM5ApqG, paid, with a working short_url) exists
    // and is listable by subscription_id, yet BOTH carry customer_id null.
    // A customer-keyed query returns nothing for them, so customerId is only
    // a fallback for invoices with no subscription (one-off fees).
    const params = new URLSearchParams();
    if (filter.subscriptionId) {
      params.set('subscription_id', filter.subscriptionId);
    } else if (filter.customerId) {
      params.set('customer_id', filter.customerId);
    } else {
      return [];
    }
    // Razorpay's list endpoint defaults to 10 items and caps `count` at 100.
    // Without an explicit count a customer past their tenth billing cycle
    // would silently lose the oldest invoices from the history page.
    params.set('count', String(Math.min(Math.max(filter.limit ?? 24, 1), 100)));

    const data = await this.request<{
      items: Array<{
        id: string;
        invoice_number: string | null;
        amount: number;
        currency: string;
        status: string;
        issued_at: number | null;
        paid_at: number | null;
        short_url: string | null;
      }>;
    }>(`/invoices?${params.toString()}`);
    const toIso = (epochSeconds: number | null | undefined) =>
      epochSeconds ? new Date(epochSeconds * 1000).toISOString() : null;
    return (data.items ?? [])
      .map(item => ({
        providerInvoiceId: item.id,
        invoiceNumber: item.invoice_number ?? null,
        amount: item.amount / 100, // Razorpay amounts are in paise
        currency: item.currency,
        status: item.status,
        issuedAt: toIso(item.issued_at),
        paidAt: toIso(item.paid_at),
        shortUrl: item.short_url ?? null,
      }))
      // Razorpay returns newest-first already, but it does not guarantee it
      // across filters — sort explicitly so the UI ordering is deterministic.
      // Draft invoices (no issued_at) sort last.
      .sort((a, b) => (b.issuedAt ?? '').localeCompare(a.issuedAt ?? ''));
  }

  async createPlan(params: {
    name: string;
    interval: 'monthly' | 'annual';
    amountInr: number;
    planSlug: string;
  }): Promise<{ providerPlanId: string }> {
    // Razorpay takes the amount in paise as an integer. Plan prices are
    // NUMERIC(12,2) rupees locally, so round rather than truncate — a price
    // of 24999.995 must not silently become 2499999 paise.
    const amountPaise = Math.round(params.amountInr * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new Error(`Cannot create a Razorpay plan for a non-positive amount (${params.amountInr})`);
    }

    const data = await this.request<{ id: string }>('/plans', {
      method: 'POST',
      body: JSON.stringify({
        period: params.interval === 'annual' ? 'yearly' : 'monthly',
        interval: 1,
        item: {
          name: params.name,
          amount: amountPaise,
          currency: 'INR',
        },
        notes: { plan_slug: params.planSlug, interval: params.interval },
      }),
    });
    return { providerPlanId: data.id };
  }

  async createOrder(params: {
    amountInr: number;
    companyId: string;
    notes: Record<string, string>;
    receipt?: string;
  }): Promise<{ providerOrderId: string; amountPaise: number }> {
    // Same rounding discipline as createPlan: rupees are NUMERIC(12,2)
    // locally, Razorpay wants an integer number of paise.
    const amountPaise = Math.round(params.amountInr * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new Error(`Cannot create a Razorpay order for a non-positive amount (${params.amountInr})`);
    }

    const data = await this.request<{ id: string; amount: number }>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        // Razorpay caps receipt at 40 chars.
        receipt: (params.receipt ?? `addon-${params.companyId}`).slice(0, 40),
        notes: { ...params.notes, company_id: params.companyId },
      }),
    });
    return { providerOrderId: data.id, amountPaise: data.amount ?? amountPaise };
  }

  async verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (hex.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  }
}

// Classifies a RazorpayBillingProvider error message (the
// `Razorpay API error ${status}: ${body}` shape thrown by `request()` above)
// as an idempotent "this subscription is already cancelled/scheduled to be
// cancelled" response rather than a genuine failure.
//
// ASSUMPTION (unverified against a live Razorpay sandbox — see
// docs/superpowers/plans/2026-08-22-razorpay-cancellation-fix.md's Global
// Constraints):
// `cancelSubscription(id, true)` sends `cancel_at_cycle_end: 1`, which does
// NOT immediately move the subscription to Razorpay's terminal `cancelled`
// status — it stays `active` with cancellation scheduled for cycle end. A
// double-submit (double-click, retry after timeout, re-cancel after reload)
// therefore realistically produces "already scheduled to be cancelled at the
// end of the current billing cycle" wording, not just a terminal "already
// been cancelled" message. Both shapes are matched here; matching is scoped
// to require "already" AND "cancel" co-occurring (in either order) so that
// unrelated 4xx errors (auth failure, bad subscription id, rate limits) are
// NOT misclassified as idempotent successes.
//
// The `cancel_at_cycle_end` literal alone is NOT sufficient to match —
// Razorpay validation-rejection error bodies can legitimately echo
// `cancel_at_cycle_end` back as a field name (e.g. "cancel_at_cycle_end
// is/are not required and should not be sent") when Razorpay is REFUSING to
// cancel, which is the opposite of idempotent success. So the
// `cancel_at_cycle_end` alternative only counts when "already" also appears
// somewhere in the message.
export function isAlreadyCancelledError(message: string): boolean {
  return /already[\s\S]*cancel|cancel[\s\S]*already/i.test(message);
}
