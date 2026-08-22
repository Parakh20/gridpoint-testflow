import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/rate_limit.ts';
import { logEdgeError } from '../_shared/monitoring.ts';
import { RazorpayBillingProvider } from '../_shared/billing_provider.ts';

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

      // TODO(Plan 2): once BillingProvider exists, call
      // billingProvider.cancelSubscription(subscription.provider_subscription_id)
      // here so Razorpay actually stops renewing at period end. The DB-side
      // cancel_at is already set above and is what the frontend/RLS reads —
      // this call is what makes the provider agree not to charge again.
      // Until Plan 2 lands, cancellation is DB-only: TestFlow will stop
      // treating the company as billable at period end, but Razorpay will
      // still attempt to charge unless cancelled manually in its dashboard.

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
        .select('id, monthly_price_inr, razorpay_plan_id_monthly, razorpay_plan_id_annual')
        .eq('slug', targetSlug)
        .eq('is_active', true)
        .eq('is_public', true)
        .single();

      if (planError || !targetPlan) return json({ error: `Unknown plan: ${targetSlug}` }, 400);

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
        .select('provider_subscription_id, billing_interval')
        .eq('company_id', callerProfile.company_id)
        .single();

      if (subError || !subscription?.provider_subscription_id) {
        return json({ error: 'No active provider subscription found for this company' }, 400);
      }

      const providerPlanId = subscription.billing_interval === 'annual'
        ? targetPlan.razorpay_plan_id_annual
        : targetPlan.razorpay_plan_id_monthly;

      if (!providerPlanId) {
        // Operator hasn't configured this plan's Razorpay mapping yet
        // (plan_provider_mapping / razorpay_plan_id_* columns) — fail
        // closed rather than silently no-op the charge.
        return json({ error: 'This plan is not yet available for self-service upgrade' }, 400);
      }

      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!keyId || !keySecret) {
        logEdgeError('manage-subscription', 'payment_failure', new Error('Razorpay credentials not configured'));
        return json({ error: 'Billing provider not configured' }, 500);
      }

      const billingProvider = new RazorpayBillingProvider(keyId, keySecret);

      try {
        // 'now' — an upgrade takes effect immediately with Razorpay
        // prorating the remainder of the current cycle into a fresh
        // invoice. This call must succeed BEFORE any local write happens:
        // if it throws, nothing in TestFlow's DB has changed and the
        // tenant can safely retry.
        await billingProvider.changeSubscription(
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
      const { error: applyError } = await callerClient.rpc('apply_plan_upgrade', {
        _company_id: callerProfile.company_id,
        _target_plan_id: targetPlan.id,
      });
      if (applyError) {
        logEdgeError('manage-subscription', 'payment_failure', applyError);
        return json({ error: 'Plan changed with billing provider but failed to record locally — it will sync on the next billing update' }, 500);
      }

      await adminClient.from('billing_audit_logs').insert({
        actor: caller.email ?? caller.id,
        company_id: callerProfile.company_id,
        action: 'PLAN_CHANGED',
        new_value: { plan_slug: targetSlug, trigger: 'self_service_upgrade' },
      });

      return json({ upgraded: true, plan_slug: targetSlug });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('manage-subscription', 'payment_failure', err);
    return json({ error: message }, 500);
  }
});
