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

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('manage-subscription', 'payment_failure', err);
    return json({ error: message }, 500);
  }
});
