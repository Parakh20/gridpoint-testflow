// Executable regression tests for the `get_company_entitlements` Postgres
// RPC (supabase/migrations/20260813000019_final_review_fixes.sql, the last
// CREATE OR REPLACE in migration order — see docs/dev/BILLING_QA_MATRIX.md's
// framing note on "final, currently-shipped version" for why that specific
// migration file is the one that matters here).
//
// This tests a Postgres function via RPC, not an HTTP Edge Function — it
// lives under supabase/functions/_shared/ anyway (rather than a new
// top-level supabase/tests/ directory) because (a) it reuses
// getServiceClient()/seedTestCompanyWithSubscription()/cleanupTestCompany()
// from ./test_helpers.ts via a plain relative import — supabase/functions/deno.json
// exists for nodeModulesDir resolution but carries no import map, so every
// local-module import in this suite must stay relative;
// and (b) `deno test --allow-net --allow-env _shared razorpay-webhook
// reconcile-cancellations` (brief Step 7 / docs run command) already treats
// `_shared` as one of the directories to sweep for *.test.ts, so this file
// is picked up for free without a separate invocation.
//
// Re-verifies the three hand-traced cases from
// 2026-08-12-enterprise-contracts-addons.md's Task 2 as executable
// assertions instead of only a manual SQL trace in that plan's doc.
//
// Actual RPC return shape confirmed by reading get_company_entitlements'
// body directly (not assumed): it RETURNS JSONB via
// `jsonb_build_object('plan_slug', ..., 'plan_name', ..., 'max_users', ...,
// 'max_active_projects', ..., 'is_custom', ..., 'features', ...)`.
// supabase-js's .rpc() for a scalar-returning (non-SETOF) function returns
// that JSONB value directly as `data`, so `data.plan_slug` /
// `data.max_users` / `data.is_custom` are real, correct property accesses —
// not a guess.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getServiceClient, seedTestCompanyWithSubscription, cleanupTestCompany } from './test_helpers.ts';

interface Entitlements {
  plan_slug: string;
  plan_name: string;
  max_users: number | null;
  max_active_projects: number | null;
  is_custom: boolean;
  features: Record<string, boolean>;
}

Deno.test('Case A: base plan only — no contract, no addons (regression check)', async () => {
  const { company } = await seedTestCompanyWithSubscription();
  const client = getServiceClient();
  try {
    const { data, error } = await client.rpc('get_company_entitlements', { _company_id: company.id });
    if (error) throw error;
    const entitlements = data as Entitlements;
    // seedTestCompanyWithSubscription() seeds the 'professional' plan
    // (supabase/migrations/20260812000001_plans_and_plan_features.sql:
    // max_users=30, max_active_projects=NULL).
    assertEquals(entitlements.plan_slug, 'professional');
    assertEquals(entitlements.max_users, 30);
    assertEquals(entitlements.max_active_projects, null);
    assertEquals(entitlements.is_custom, false);
  } finally {
    await cleanupTestCompany(company.id);
  }
});

Deno.test('Case B: plan + extra_users addon — max_users increases by quantity', async () => {
  const { company, subscription } = await seedTestCompanyWithSubscription();
  const client = getServiceClient();
  try {
    const { data: planRow, error: planError } = await client
      .from('plans')
      .select('max_users')
      .eq('slug', 'professional')
      .single();
    if (planError) throw planError;

    const { error: addonError } = await client
      .from('subscription_addons')
      .insert({ subscription_id: subscription.id, addon_key: 'extra_users', quantity: 15, status: 'active' });
    if (addonError) throw addonError;

    const { data, error } = await client.rpc('get_company_entitlements', { _company_id: company.id });
    if (error) throw error;
    const entitlements = data as Entitlements;
    assertEquals(entitlements.max_users, (planRow?.max_users ?? 0) + 15);
  } finally {
    await cleanupTestCompany(company.id);
  }
});

Deno.test('Case C: unlimited enterprise contract + addon stays unlimited (NULL + N = NULL)', async () => {
  const { company, subscription } = await seedTestCompanyWithSubscription();
  const client = getServiceClient();
  try {
    const { error: contractError } = await client
      .from('enterprise_contracts')
      .insert({ company_id: company.id, max_users: null, max_active_projects: null });
    if (contractError) throw contractError;

    const { error: addonError } = await client
      .from('subscription_addons')
      .insert({ subscription_id: subscription.id, addon_key: 'extra_users', quantity: 50, status: 'active' });
    if (addonError) throw addonError;

    const { data, error } = await client.rpc('get_company_entitlements', { _company_id: company.id });
    if (error) throw error;
    const entitlements = data as Entitlements;
    // NULL (unlimited, from the contract) + 50 (addon quantity) must stay
    // NULL in Postgres arithmetic — get_company_entitlements does
    // `effective_max_users := effective_max_users + addon_extra_users`
    // with no COALESCE, so this is exercising that exact NULL-propagation
    // behavior, not a coincidence.
    assertEquals(entitlements.max_users, null); // must stay unlimited, not a finite number
    assertEquals(entitlements.is_custom, true);
  } finally {
    await cleanupTestCompany(company.id);
  }
});
