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

    let body: Record<string, unknown> | null = null;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    const action = body?.action;

    // Rate limit: 10 billing calls per user per hour — renewal and add-on
    // purchases are low-frequency admin actions, tighter than create-user's
    // 30/hr. `invoices` is read-only and gets its own, looser bucket: it is
    // fetched on every billing-page load, so sharing the mutation bucket
    // would let ordinary page views exhaust the quota renewal needs.
    const isReadOnly = action === 'invoices';
    const rl = await enforceRateLimit(adminClient, req, {
      key: isReadOnly ? `manage-subscription:invoices:${caller.id}` : `manage-subscription:${caller.id}`,
      limit: isReadOnly ? 60 : 10,
      windowMinutes: 60,
    }, cors);
    if (!rl.ok) return rl.response;

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('company_id')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.company_id) return json({ error: 'Caller has no company assigned' }, 400);

    if (action === 'renew_plan') {
      // Buying a period is spending the company's money — SUPERADMIN only,
      // checked server-side because the route gate is not a security boundary.
      const { data: callerRoles } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id);

      if (!(callerRoles ?? []).some(r => r.role === 'SUPERADMIN')) {
        return json({ error: 'Only a SUPERADMIN can renew the plan' }, 403);
      }

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
        .select('id, name, monthly_price_inr, annual_price_inr')
        .eq('slug', targetSlug)
        .eq('is_active', true)
        .eq('is_public', true)
        .eq('is_custom', false)
        .single();

      if (planError || !targetPlan) return json({ error: `Unknown plan: ${targetSlug}` }, 400);

      const amountInr = billingInterval === 'annual'
        ? targetPlan.annual_price_inr
        : targetPlan.monthly_price_inr;

      if (amountInr == null) {
        return json({ error: 'This plan has no self-service price — contact sales' }, 400);
      }

      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!keyId || !keySecret) {
        logEdgeError('manage-subscription', 'payment_failure', new Error('Razorpay credentials not configured'));
        return json({ error: 'Billing provider not configured' }, 500);
      }

      try {
        // Price comes from `plans`, never from the request body — the client
        // chooses which plan and which interval, never what it costs.
        const order = await new RazorpayBillingProvider(keyId, keySecret).createOrder({
          amountInr: Number(amountInr),
          companyId: callerProfile.company_id,
          receipt: `renew-${targetSlug}-${Date.now()}`,
          notes: {
            order_type: 'plan_renewal',
            plan_slug: targetSlug,
            billing_interval: billingInterval,
          },
        });

        // The period is granted by razorpay-webhook on payment.captured, which
        // is the only proof the customer actually paid. Nothing is written
        // locally here, so an abandoned checkout extends nothing.
        return json({
          order_id: order.providerOrderId,
          amount_inr: Number(amountInr),
          plan_name: targetPlan.name,
          billing_interval: billingInterval,
          razorpay_key_id: keyId,
        });
      } catch (err: unknown) {
        logEdgeError('manage-subscription', 'payment_failure', err);
        const message = err instanceof Error ? err.message : 'Failed to start renewal checkout';
        return json({ error: message }, 502);
      }
    }

    if (action === 'purchase_addon') {
      // Same reasoning as `invoices`: the /settings/billing route gates on
      // SUPERADMIN client-side, which is not a security boundary — this
      // function is callable directly with any signed-in user's JWT, and this
      // action spends the company's money.
      const { data: callerRoles } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id);

      if (!(callerRoles ?? []).some(r => r.role === 'SUPERADMIN')) {
        return json({ error: 'Only a SUPERADMIN can purchase add-ons' }, 403);
      }

      const addonKey = body?.addon_key;
      const quantity = Math.trunc(Number(body?.quantity ?? 1));
      if (typeof addonKey !== 'string' || !addonKey) {
        return json({ error: 'addon_key is required' }, 400);
      }
      if (!Number.isFinite(quantity) || quantity < 1) {
        return json({ error: 'quantity must be a positive whole number' }, 400);
      }

      const { data: addon } = await adminClient
        .from('addon_catalog')
        .select('addon_key, name, unit_price_inr, kind, max_quantity, is_active')
        .eq('addon_key', addonKey)
        .maybeSingle();

      if (!addon || !addon.is_active) {
        return json({ error: `Add-on not available for self-service purchase: ${addonKey}` }, 400);
      }
      if (quantity > addon.max_quantity) {
        return json({ error: `At most ${addon.max_quantity} of this add-on can be bought at once` }, 400);
      }

      // A flag add-on is a single grant; buying a second is always a mistake
      // and the money would have to be refunded. Blocked before the charge,
      // not after it.
      const effectiveQuantity = addon.kind === 'quantity' ? quantity : 1;

      // Add-ons hang off a subscription row (subscription_addons.subscription_id
      // is NOT NULL), so a trial company has nothing to attach one to. Fail
      // with a reason rather than taking the payment and stranding it.
      const { data: subscription } = await adminClient
        .from('subscriptions')
        .select('id, provider_subscription_id')
        .eq('company_id', callerProfile.company_id)
        .maybeSingle();

      if (!subscription?.provider_subscription_id) {
        return json({ error: 'Add-ons require an active subscription — subscribe to a plan first' }, 409);
      }

      if (addon.kind === 'flag') {
        const { data: existingAddon } = await adminClient
          .from('subscription_addons')
          .select('id')
          .eq('subscription_id', subscription.id)
          .eq('addon_key', addonKey)
          .eq('status', 'active')
          .maybeSingle();
        if (existingAddon) {
          return json({ error: `${addon.name} is already active on this subscription` }, 409);
        }
      }

      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!keyId || !keySecret) {
        logEdgeError('manage-subscription', 'payment_failure', new Error('Razorpay credentials not configured'));
        return json({ error: 'Billing provider not configured' }, 500);
      }

      const amountInr = Number(addon.unit_price_inr) * effectiveQuantity;

      try {
        // The price is computed server-side from the catalogue and never
        // taken from the request body — the client chooses what and how many,
        // never how much.
        const order = await new RazorpayBillingProvider(keyId, keySecret).createOrder({
          amountInr,
          companyId: callerProfile.company_id,
          receipt: `addon-${addonKey}-${Date.now()}`,
          notes: {
            order_type: 'addon',
            addon_key: addonKey,
            quantity: String(effectiveQuantity),
          },
        });

        // No local write here, same discipline as `subscribe`: the entitlement
        // is granted by razorpay-webhook on payment.captured, which is the
        // only proof the customer actually paid.
        return json({
          order_id: order.providerOrderId,
          amount_inr: amountInr,
          quantity: effectiveQuantity,
          addon_name: addon.name,
          razorpay_key_id: keyId,
        });
      } catch (err: unknown) {
        logEdgeError('manage-subscription', 'payment_failure', err);
        const message = err instanceof Error ? err.message : 'Failed to start add-on checkout';
        return json({ error: message }, 502);
      }
    }

    if (action === 'invoices') {
      // Billing data is SUPERADMIN-only. The /settings/billing route already
      // gates on that client-side, but that is not a security boundary —
      // this function is callable directly with any signed-in user's JWT.
      const { data: callerRoles } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id);

      if (!(callerRoles ?? []).some(r => r.role === 'SUPERADMIN')) {
        return json({ error: 'Only a SUPERADMIN can view billing invoices' }, 403);
      }

      const { data: sub } = await adminClient
        .from('subscriptions')
        .select('provider_customer_id, provider_subscription_id')
        .eq('company_id', callerProfile.company_id)
        .maybeSingle();

      // No subscription at the provider at all (still on trial, or an
      // abandoned checkout): an empty list is the correct answer, not an error.
      if (!sub?.provider_subscription_id) return json({ invoices: [] });

      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!keyId || !keySecret) {
        logEdgeError('manage-subscription', 'payment_failure', new Error('Razorpay credentials not configured'));
        return json({ error: 'Billing provider not configured' }, 500);
      }

      try {
        // Keyed on the subscription, not the customer: Razorpay only links an
        // invoice to a customer when the subscription was created with a
        // customer_id, and ours are not — sub_TT8Tw2ktlofRVj is active and
        // paid yet both it and its invoice carry customer_id null, so a
        // customer-keyed query returned an empty list for a tenant that
        // demonstrably has an invoice. provider_customer_id stays in the
        // table (and migration 20260823000004 stops webhooks erasing it) for
        // one-off, non-subscription invoices.
        const invoices = await new RazorpayBillingProvider(keyId, keySecret)
          .getInvoices({ subscriptionId: sub.provider_subscription_id });
        return json({ invoices });
      } catch (err: unknown) {
        logEdgeError('manage-subscription', 'payment_failure', err);
        return json({ error: 'Could not load invoices from the billing provider' }, 502);
      }
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('manage-subscription', 'payment_failure', err);
    return json({ error: message }, 500);
  }
});
