import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/rate_limit.ts';
import { logEdgeError } from '../_shared/monitoring.ts';
import { RazorpayBillingProvider, isAlreadyCancelledError } from '../_shared/billing_provider.ts';

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Rate limit: 10 subscription-management calls per user per hour —
    // this is a low-frequency admin action, tighter than create-user's 30/hr.
    const rl = await enforceRateLimit(adminClient, req, {
      key: `manage-subscription:${caller.id}`,
      limit: 10,
      windowMinutes: 60,
    }, cors);
    if (!rl.ok) return rl.response;

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('company_id')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.company_id) return json({ error: 'Caller has no company assigned' }, 400);

    const body = await req.json();
    const action = body?.action;

    if (action === 'cancel') {
      const { data, error } = await callerClient.rpc('request_subscription_cancellation', {
        _company_id: callerProfile.company_id,
      });
      if (error) return json({ error: error.message }, 400);

      // Guard against local/provider divergence: request_subscription_
      // cancellation does `cancel_at = COALESCE(cancel_at, period_end)` and
      // returns `cancel_at` in its JSON response. If the company's
      // subscriptions.current_period_end was NULL, the RPC's returned
      // cancel_at comes back null/missing too — meaning NO local
      // cancellation timestamp was actually recorded (existing non-null
      // cancel_at, if any, was left untouched by the COALESCE, but the RPC
      // still reports back whatever `period_end` it read, which is null
      // here). Telling Razorpay to cancel in that state would leave
      // Razorpay stopped but the local record looking like nothing
      // happened, and flip_expired_cancellations() (which keys off
      // cancel_at) couldn't help. So skip the Razorpay call entirely and
      // surface it explicitly instead of silently proceeding.
      if (!data?.cancel_at) {
        return json({
          ...data,
          provider_cancel_warning: 'Local cancellation timestamp was not recorded (no cancel_at), so Razorpay was not contacted — resolve the missing current_period_end and retry.',
        }, 200);
      }

      // Tell Razorpay to actually stop renewing, matching the cancel_at the RPC
      // above just set (always current_period_end, per
      // request_subscription_cancellation's COALESCE(cancel_at, period_end)).
      // atPeriodEnd=true maps to Razorpay's cancel_at_cycle_end:1 — Razorpay
      // itself now defers the real cutoff to the end of the paid cycle, so no
      // second call is needed later (see this plan's Global Constraints for why
      // reconcile-cancellations deliberately does NOT also call Razorpay).
      //
      // Deliberately NOT rolled back on Razorpay failure below — cancel_at is
      // already committed and is what RLS/entitlements read; surfacing an error
      // here tells the operator Razorpay wasn't reached, without silently
      // un-cancelling a subscription the user just confirmed.
      const { data: sub, error: subLookupError } = await callerClient
        .from('subscriptions')
        .select('provider_subscription_id')
        .eq('company_id', callerProfile.company_id)
        .single();

      if (subLookupError) {
        logEdgeError('manage-subscription', 'payment_failure', subLookupError, {
          step: 'cancel_provider_lookup', companyId: callerProfile.company_id,
        });
        return json({ ...data, provider_cancel_warning: 'Local cancellation recorded, but no Razorpay subscription is on file to cancel provider-side.' }, 200);
      }

      if (!sub?.provider_subscription_id) {
        // Not a failure: companies on a trial routinely have no Razorpay
        // subscription yet, by design. Logging this under 'payment_failure'
        // would pollute the category a future alert filters on with
        // routine, expected non-failures — so log it separately at info
        // level instead of via logEdgeError.
        console.log(JSON.stringify({
          level: 'info',
          function: 'manage-subscription',
          message: 'Cancel requested for a company with no provider_subscription_id on file (expected for trial-only subscriptions)',
          context: { step: 'cancel_provider_lookup', companyId: callerProfile.company_id },
          timestamp: new Date().toISOString(),
        }));
        return json({ ...data, provider_cancel_warning: 'Local cancellation recorded, but no Razorpay subscription is on file to cancel provider-side.' }, 200);
      }

      const provider = new RazorpayBillingProvider(
        Deno.env.get('RAZORPAY_KEY_ID') ?? '',
        Deno.env.get('RAZORPAY_KEY_SECRET') ?? '',
      );

      try {
        await provider.cancelSubscription(sub.provider_subscription_id, true);
      } catch (providerErr) {
        // ASSUMPTION (flagged per this plan's Global Constraints — unverified
        // against a live Razorpay sandbox): Razorpay's "already cancelled /
        // already scheduled to cancel" errors surface as a 4xx whose body
        // contains that wording. RazorpayBillingProvider.request() throws
        // `Razorpay API error ${status}: ${body}` — matching on substrings is
        // fragile (breaks if Razorpay changes their error copy) but this repo
        // doesn't currently expose a structured error code from that method.
        // The classifier lives in _shared/billing_provider.ts
        // (isAlreadyCancelledError) so it has its own unit test coverage
        // independent of this function. Treated as idempotent success rather
        // than failure so a double-cancel (e.g. a retried request after a
        // timeout, or a re-cancel of a subscription already scheduled via
        // cancel_at_cycle_end) doesn't error.
        const message = providerErr instanceof Error ? providerErr.message : String(providerErr);

        if (!isAlreadyCancelledError(message)) {
          logEdgeError('manage-subscription', 'payment_failure', providerErr, {
            step: 'cancel_provider_call', companyId: callerProfile.company_id,
            providerSubscriptionId: sub.provider_subscription_id,
          });
          return json({
            ...data,
            provider_cancel_warning: 'Local cancellation recorded, but Razorpay was not reached — billing may continue until this is resolved manually.',
          }, 200);
        }
        // Already cancelled provider-side: fall through, this is a success.
        // Still log it (info level, not an error) so the classifier's
        // real-world hit rate is auditable against production traffic —
        // without this, a *correct* classification left zero trail.
        console.log(JSON.stringify({
          level: 'info',
          function: 'manage-subscription',
          message: 'Razorpay cancelSubscription treated as idempotent success (already cancelled/scheduled)',
          context: {
            step: 'cancel_provider_call',
            companyId: callerProfile.company_id,
            providerSubscriptionId: sub.provider_subscription_id,
            razorpayMessage: message,
          },
          timestamp: new Date().toISOString(),
        }));
      }

      return json(data);
    }

    if (action === 'downgrade') {
      const targetSlug = body?.target_plan_slug;
      if (typeof targetSlug !== 'string' || !targetSlug) {
        return json({ error: 'target_plan_slug is required' }, 400);
      }

      const { data: targetPlan, error: planError } = await adminClient
        .from('plans')
        .select('id')
        .eq('slug', targetSlug)
        .eq('is_active', true)
        .eq('is_public', true)
        .single();

      if (planError || !targetPlan) return json({ error: `Unknown plan: ${targetSlug}` }, 400);

      const { data, error } = await callerClient.rpc('request_plan_downgrade', {
        _company_id: callerProfile.company_id,
        _target_plan_id: targetPlan.id,
      });
      if (error) return json({ error: error.message }, 400);

      // TODO(Plan 2): once BillingProvider exists, call
      // billingProvider.changeSubscription(...) here to update the
      // provider-side plan/quantity for the NEXT billing cycle, matching
      // the pending_plan_id this RPC just set. Until Plan 2 lands, the
      // downgrade is scheduled DB-side only and applied automatically by
      // upsert_subscription (Task 4) the next time any webhook event
      // reports a period rollover — which won't happen until Plan 2 wires
      // real webhook delivery.

      if (data?.scheduled === false) return json(data, 409);
      return json(data);
    }

    if (action === 'upgrade') {
      const targetSlug = body?.target_plan_slug;
      if (typeof targetSlug !== 'string' || !targetSlug) {
        return json({ error: 'target_plan_slug is required' }, 400);
      }

      const { data: targetPlan, error: planError } = await adminClient
        .from('plans')
        .select('id, monthly_price_inr')
        .eq('slug', targetSlug)
        .eq('is_active', true)
        .eq('is_public', true)
        .single();

      if (planError || !targetPlan) return json({ error: `Unknown plan: ${targetSlug}` }, 400);

      // Razorpay plan ids live on the service-role-only plan_provider_mapping
      // table — they were moved off the anon-readable `plans` table in
      // 20260813000005_final_review_fixes.sql. Missing row / missing column
      // for this billing interval is handled by the NULL guard below.
      const { data: providerMapping } = await adminClient
        .from('plan_provider_mapping')
        .select('razorpay_plan_id_monthly, razorpay_plan_id_annual')
        .eq('plan_id', targetPlan.id)
        .maybeSingle();

      // Pre-flight: never call Razorpay for a doomed upgrade (enterprise
      // contract active, target isn't strictly higher-priced, etc).
      const { data: eligibility, error: eligibilityError } = await callerClient.rpc(
        'check_plan_upgrade_eligibility',
        { _company_id: callerProfile.company_id, _target_plan_id: targetPlan.id },
      );
      if (eligibilityError) return json({ error: eligibilityError.message }, 400);
      if (!eligibility?.eligible) {
        return json({ upgraded: false, reason: eligibility?.reason ?? 'Not eligible to upgrade' }, 409);
      }

      const { data: subscription, error: subError } = await adminClient
        .from('subscriptions')
        .select('provider_subscription_id, billing_interval, plan_id')
        .eq('company_id', callerProfile.company_id)
        .single();

      if (subError || !subscription?.provider_subscription_id) {
        return json({ error: 'No active provider subscription found for this company' }, 400);
      }

      // Captured BEFORE the upgrade so the audit log can record what the
      // company moved FROM. Deliberately a separate lookup rather than a
      // PostgREST embed: `subscriptions` has TWO foreign keys into `plans`
      // (plan_id and pending_plan_id), which makes `plans(slug)` an
      // ambiguous-relationship error. plan_id is nullable (a company on a
      // trial with no resolved mapping has none), so this stays optional.
      let priorPlanSlug: string | null = null;
      if (subscription.plan_id) {
        const { data: priorPlan } = await adminClient
          .from('plans')
          .select('slug')
          .eq('id', subscription.plan_id)
          .maybeSingle();
        priorPlanSlug = priorPlan?.slug ?? null;
      }

      const providerPlanId = subscription.billing_interval === 'annual'
        ? providerMapping?.razorpay_plan_id_annual
        : providerMapping?.razorpay_plan_id_monthly;

      if (!providerPlanId) {
        // Operator hasn't configured this plan's Razorpay mapping yet
        // (no plan_provider_mapping row, or no id for this interval) —
        // fail closed rather than silently no-op the charge.
        return json({ error: 'This plan is not yet available for self-service upgrade' }, 400);
      }

      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!keyId || !keySecret) {
        logEdgeError('manage-subscription', 'payment_failure', new Error('Razorpay credentials not configured'));
        return json({ error: 'Billing provider not configured' }, 500);
      }

      const billingProvider = new RazorpayBillingProvider(keyId, keySecret);

      let changed: Awaited<ReturnType<typeof billingProvider.changeSubscription>>;
      try {
        // 'now' — an upgrade takes effect immediately with Razorpay
        // prorating the remainder of the current cycle into a fresh
        // invoice. This call must succeed BEFORE any local write happens:
        // if it throws, nothing in TestFlow's DB has changed and the
        // tenant can safely retry.
        changed = await billingProvider.changeSubscription(
          subscription.provider_subscription_id,
          providerPlanId,
          'now',
        );
      } catch (err: unknown) {
        logEdgeError('manage-subscription', 'payment_failure', err);
        const message = err instanceof Error ? err.message : 'Failed to change plan with billing provider';
        return json({ error: message }, 502);
      }

      // Razorpay confirmed — apply the local write now. If this specific
      // call fails (network drop, function crash), the plan is still
      // correct at Razorpay and the next webhook delivery reconciles
      // subscriptions.plan_id via upsert_subscription's existing
      // plan_provider_mapping resolution — no separate recovery needed.
      // Service-role only (20260822000005) — this RPC is deliberately not
      // reachable by an authenticated client, so it goes through adminClient.
      // Authorization already happened above, against the caller's own session.
      const { error: applyError } = await adminClient.rpc('apply_plan_upgrade', {
        _company_id: callerProfile.company_id,
        _target_plan_id: targetPlan.id,
        _period_start: changed.currentPeriodStart,
        _period_end: changed.currentPeriodEnd,
      });
      if (applyError) {
        logEdgeError('manage-subscription', 'payment_failure', applyError);
        return json({ error: 'Plan changed with billing provider but failed to record locally — it will sync on the next billing update' }, 500);
      }

      // The upgrade already succeeded — an audit-log write failure must not
      // fail the request, but it must not be silent either.
      const { error: auditError } = await adminClient.from('billing_audit_logs').insert({
        actor: caller.email ?? caller.id,
        company_id: callerProfile.company_id,
        action: 'PLAN_CHANGED',
        old_value: { plan_slug: priorPlanSlug },
        new_value: { plan_slug: targetSlug, trigger: 'self_service_upgrade' },
      });
      if (auditError) {
        logEdgeError('manage-subscription', 'payment_failure', auditError);
      }

      return json({ upgraded: true, plan_slug: targetSlug });
    }

    if (action === 'subscribe') {
      const targetSlug = body?.target_plan_slug;
      const billingInterval = body?.billing_interval;
      if (typeof targetSlug !== 'string' || !targetSlug) {
        return json({ error: 'target_plan_slug is required' }, 400);
      }
      if (billingInterval !== 'monthly' && billingInterval !== 'annual') {
        return json({ error: "billing_interval must be 'monthly' or 'annual'" }, 400);
      }

      const { data: targetPlan, error: planError } = await adminClient
        .from('plans')
        .select('id, name')
        .eq('slug', targetSlug)
        .eq('is_active', true)
        .eq('is_public', true)
        .eq('is_custom', false)
        .single();

      if (planError || !targetPlan) return json({ error: `Unknown plan: ${targetSlug}` }, 400);

      const { data: providerMapping } = await adminClient
        .from('plan_provider_mapping')
        .select('razorpay_plan_id_monthly, razorpay_plan_id_annual')
        .eq('plan_id', targetPlan.id)
        .maybeSingle();

      const providerPlanId = billingInterval === 'annual'
        ? providerMapping?.razorpay_plan_id_annual
        : providerMapping?.razorpay_plan_id_monthly;

      if (!providerPlanId) {
        return json({ error: 'This plan is not yet available for self-service checkout' }, 400);
      }

      // A company already mid-subscription (has a Razorpay subscription on
      // file) must use 'upgrade'/'downgrade'/'cancel' instead — 'subscribe'
      // is only for a trial company starting its first paid subscription.
      const { data: existingSub } = await adminClient
        .from('subscriptions')
        .select('provider_subscription_id, provider_customer_id')
        .eq('company_id', callerProfile.company_id)
        .maybeSingle();

      if (existingSub?.provider_subscription_id) {
        return json({ error: 'This company already has an active subscription — use upgrade/downgrade instead' }, 409);
      }

      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!keyId || !keySecret) {
        logEdgeError('manage-subscription', 'payment_failure', new Error('Razorpay credentials not configured'));
        return json({ error: 'Billing provider not configured' }, 500);
      }

      const { data: company } = await adminClient
        .from('companies')
        .select('name')
        .eq('id', callerProfile.company_id)
        .single();

      const billingProvider = new RazorpayBillingProvider(keyId, keySecret);

      try {
        // Reuse an existing Razorpay customer id if a prior (abandoned)
        // checkout attempt already created one for this company, rather
        // than creating a duplicate customer record at Razorpay.
        let providerCustomerId = existingSub?.provider_customer_id ?? null;
        if (!providerCustomerId) {
          const customer = await billingProvider.createCustomer({
            name: company?.name ?? 'TestFlow customer',
            email: caller.email ?? '',
            companyId: callerProfile.company_id,
          });
          providerCustomerId = customer.providerCustomerId;
        }

        const subscription = await billingProvider.createSubscription({
          providerCustomerId,
          providerPlanId,
          companyId: callerProfile.company_id,
          seatCount: 1,
        });

        // Deliberately no local subscriptions write here: Razorpay's
        // checkout modal (client-side, using this subscription_id) is what
        // actually authorizes payment. razorpay-webhook resolves
        // company_id from the subscription's notes (set by createSubscription
        // above) and calls upsert_subscription on the resulting
        // subscription.authenticated/activated events — that's the single
        // source of truth for "did this checkout actually complete",
        // avoiding a local row that claims a subscription exists before the
        // customer has actually paid anything.
        return json({
          subscription_id: subscription.providerSubscriptionId,
          razorpay_key_id: keyId,
          plan_name: targetPlan.name,
        });
      } catch (err: unknown) {
        logEdgeError('manage-subscription', 'payment_failure', err);
        const message = err instanceof Error ? err.message : 'Failed to start checkout with billing provider';
        return json({ error: message }, 502);
      }
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('manage-subscription', 'payment_failure', err);
    return json({ error: message }, 500);
  }
});
