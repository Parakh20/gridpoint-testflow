import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/rate_limit.ts';

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

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
