import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/rate_limit.ts';

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const provider = user.app_metadata?.provider;
    if (provider !== 'google') return json({ error: 'Only Google OAuth is supported' }, 400);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const rl = await enforceRateLimit(adminClient, req, {
      key: `provision-oauth:${user.id}`,
      limit: 20,
      windowMinutes: 60,
    }, cors);
    if (!rl.ok) return rl.response;

    // Returning user — already has a role
    const { data: existingRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingRole) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('is_active, oauth_pending')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.is_active === false) return json({ error: 'account_disabled' }, 403);
      return json({ status: 'provisioned' });
    }

    // Check for a pending profile (previously queued)
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('company_id, is_active, oauth_pending')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile?.is_active === false) return json({ error: 'account_disabled' }, 403);
    if (existingProfile?.oauth_pending) return json({ status: 'pending' });

    // New OAuth user — do domain lookup
    const email = user.email;
    if (!email) return json({ error: 'No email on OAuth account' }, 400);
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return json({ error: 'Invalid email format' }, 400);

    const { data: company } = await adminClient
      .from('companies')
      .select('id, oauth_provisioning, is_active')
      .contains('allowed_domains', [domain])
      .maybeSingle();

    if (!company) return json({ error: 'no_company_match' }, 403);
    if (!company.is_active) return json({ error: 'company_suspended' }, 403);

    const mode = company.oauth_provisioning as string;
    if (mode === 'off') return json({ error: 'oauth_disabled' }, 403);

    const fullName: string =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      email.split('@')[0];

    if (mode === 'auto') {
      await adminClient.from('profiles').upsert(
        { id: user.id, name: fullName, email, company_id: company.id, is_active: true, oauth_pending: false },
        { onConflict: 'id' },
      );
      // company_id must be stamped on the role row: user_roles_superadmin_manage
      // filters on it, so a NULL here creates a grant no SUPERADMIN can revoke
      // through the API even though has_role() still honours it.
      await adminClient.from('user_roles').upsert(
        { user_id: user.id, role: 'ENGINEER', company_id: company.id },
        { onConflict: 'user_id,role' },
      );
      return json({ status: 'provisioned' });
    }

    // mode === 'pending'
    await adminClient.from('profiles').upsert(
      { id: user.id, name: fullName, email, company_id: company.id, is_active: true, oauth_pending: true },
      { onConflict: 'id' },
    );
    return json({ status: 'pending' });

  } catch (err: unknown) {
    console.error('[provision-oauth-user]', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
