// Shared helpers for the Deno integration-test suite added in Plan 4
// (redesign/04-reports-billing-superadmin, Task 9). Run against a local
// `supabase start` instance ONLY — never against production. This is the
// first Edge Function test convention in this repo (supabase/functions/deno.json
// exists for nodeModulesDir resolution but carries no import map, so every
// local-module import here and in the *.test.ts files that consume this is a
// relative path, mirroring the plain-relative-import pattern already established
// for non-test code under supabase/functions/_shared/).
//
// Required env before running:
//   SUPABASE_URL                 defaults to the local Supabase URL
//   SUPABASE_SERVICE_ROLE_KEY    the LOCAL service-role key (`supabase status -o json`)
//   RAZORPAY_WEBHOOK_SECRET      must match what the local Edge Function runtime
//                                 has configured (supabase/.env or `supabase secrets set`
//                                 for local dev) — never a production secret.
//   RECONCILE_CRON_SECRET        same idea, for reconcile-cancellations.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOCAL_URL = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';
const LOCAL_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export function getServiceClient() {
  if (!LOCAL_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY not set — run against a local `supabase start` ' +
      'instance and export it first (see `supabase status -o json`). Never point ' +
      'this at a production project.'
    );
  }
  return createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Mirrors RazorpayBillingProvider.verifyWebhookSignature in
// supabase/functions/_shared/billing_provider.ts EXACTLY: HMAC-SHA256 over
// the raw request body, hex-encoded. Read that file's signature-check block
// before changing this — they must match, or every "valid signature" test
// case will fail against real handler code for the wrong reason.
export async function signRazorpayPayload(rawBody: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  return toHex(new Uint8Array(sig));
}

// Seeds a company + a single active subscription (subscriptions.company_id
// is UNIQUE — one subscription per company by schema design; see
// supabase/migrations/20260813000005_final_review_fixes.sql). Defaults to
// the 'professional' plan (max_users=30, max_active_projects=NULL) seeded by
// supabase/migrations/20260812000001_plans_and_plan_features.sql. Pass
// `overrides` to set fields like `cancel_at` / `status` directly on the
// subscriptions row for reconcile-cancellations tests.
export async function seedTestCompanyWithSubscription(overrides: Record<string, unknown> = {}) {
  const client = getServiceClient();
  const suffix = crypto.randomUUID();
  const { data: company, error: companyError } = await client
    .from('companies')
    .insert({ name: `Test Co ${suffix}`, slug: `test-${suffix.slice(0, 8)}`, is_active: true })
    .select('*')
    .single();
  if (companyError) throw companyError;

  const { data: plan, error: planError } = await client
    .from('plans')
    .select('id')
    .eq('slug', 'professional')
    .single();
  if (planError) throw planError;

  const { data: subscription, error: subError } = await client
    .from('subscriptions')
    .insert({ company_id: company.id, plan_id: plan?.id, status: 'active', ...overrides })
    .select('*')
    .single();
  if (subError) throw subError;

  return { company, subscription };
}

// Cleans up everything seeded for one test company, self-contained and
// re-runnable. NOTE (bug fix, was planted in the task-9 brief's draft):
// subscription_addons.subscription_id references subscriptions.id, not
// companies.id — `subscription_addons.delete().eq('subscription_id', companyId)`
// would silently match zero rows (a companyId is never a subscription_id),
// leaking test data across runs. Fixed by looking up this company's
// subscription id(s) first and filtering the addons delete by that.
//
// In practice supabase/migrations/20260813000013_enterprise_contracts_and_addons.sql
// declares subscription_addons.subscription_id REFERENCES subscriptions(id)
// ON DELETE CASCADE, and subscriptions.company_id REFERENCES companies(id)
// ON DELETE CASCADE too, so deleting the company alone would eventually
// cascade all of this anyway — the explicit per-table deletes below are kept
// for clarity/self-documentation of what a "test company" owns, and so this
// helper doesn't silently rely on FK cascade behavior it doesn't demonstrate.
export async function cleanupTestCompany(companyId: string) {
  const client = getServiceClient();

  const { data: subs, error: subsLookupError } = await client
    .from('subscriptions')
    .select('id')
    .eq('company_id', companyId);
  if (subsLookupError) throw subsLookupError;

  const subscriptionIds = (subs ?? []).map((s: { id: string }) => s.id);
  if (subscriptionIds.length > 0) {
    await client.from('subscription_addons').delete().in('subscription_id', subscriptionIds);
  }

  await client.from('subscriptions').delete().eq('company_id', companyId);
  await client.from('enterprise_contracts').delete().eq('company_id', companyId);
  // billing_events.company_id also cascades on company delete, but this
  // repo's other billing tables get explicit cleanup above rather than
  // relying purely on cascade, so do the same here for consistency.
  await client.from('billing_events').delete().eq('company_id', companyId);
  await client.from('companies').delete().eq('id', companyId);
}
