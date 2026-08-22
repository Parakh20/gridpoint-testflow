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

      if (subLookupError || !sub?.provider_subscription_id) {
        logEdgeError('manage-subscription', 'payment_failure', subLookupError ?? new Error('missing provider_subscription_id'), {
          step: 'cancel_provider_lookup', companyId: callerProfile.company_id,
        });
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

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('manage-subscription', 'payment_failure', err);
    return json({ error: message }, 500);
  }
});
