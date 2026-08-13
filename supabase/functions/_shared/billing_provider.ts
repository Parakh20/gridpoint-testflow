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
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface BillingInvoice {
  providerInvoiceId: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string;
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
  changeSubscription(providerSubscriptionId: string, newProviderPlanId: string): Promise<BillingSubscription>;
  getSubscription(providerSubscriptionId: string): Promise<BillingSubscription>;
  getInvoices(providerCustomerId: string): Promise<BillingInvoice[]>;
  verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean>;
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
        customer_notify: 1,
        quantity: params.seatCount,
        notes: { company_id: params.companyId },
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

  async changeSubscription(providerSubscriptionId: string, newProviderPlanId: string): Promise<BillingSubscription> {
    const data = await this.request<{
      id: string; status: string; current_start: number | null; current_end: number | null;
    }>(`/subscriptions/${providerSubscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ plan_id: newProviderPlanId, schedule_change_at: 'cycle_end' }),
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
    }>(`/subscriptions/${providerSubscriptionId}`);
    return {
      providerSubscriptionId: data.id,
      status: data.status,
      currentPeriodStart: data.current_start ? new Date(data.current_start * 1000).toISOString() : null,
      currentPeriodEnd: data.current_end ? new Date(data.current_end * 1000).toISOString() : null,
    };
  }

  async getInvoices(providerCustomerId: string): Promise<BillingInvoice[]> {
    const data = await this.request<{
      items: Array<{ id: string; amount: number; currency: string; status: string; issued_at: number }>;
    }>(`/invoices?customer_id=${encodeURIComponent(providerCustomerId)}`);
    return data.items.map(item => ({
      providerInvoiceId: item.id,
      amount: item.amount / 100, // Razorpay amounts are in paise
      currency: item.currency,
      status: item.status,
      issuedAt: new Date(item.issued_at * 1000).toISOString(),
    }));
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
