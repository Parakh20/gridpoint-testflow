import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // 1. Authenticate the caller using their JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401);

    // 2. Verify caller is SUPERADMIN
    const { data: roleRow } = await callerClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (roleRow?.role !== 'SUPERADMIN') return json({ error: 'Forbidden: SUPERADMIN role required' }, 403);

    // 3. Get caller's company_id — new users are created in the same company
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('company_id')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.company_id) return json({ error: 'Caller has no company assigned' }, 400);

    // 4. Parse and validate request body
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password || !role) {
      return json({ error: 'name, email, password, and role are required' }, 400);
    }
    const validRoles = ['SUPERADMIN', 'GM', 'SUPERVISOR', 'ENGINEER'];
    if (!validRoles.includes(role)) {
      return json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, 400);
    }

    // 5. Use Admin API to create the user (requires service role key)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip confirmation email — admin-created accounts are pre-confirmed
      user_metadata: { name },
    });

    if (createError) return json({ error: createError.message }, 400);
    const newUserId = newUserData.user.id;

    // 6. Set company_id on the auto-created profile (trigger creates it without company_id)
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ company_id: callerProfile.company_id, name })
      .eq('id', newUserId);

    if (profileError) {
      // Roll back auth user creation to avoid orphaned auth records
      await adminClient.auth.admin.deleteUser(newUserId);
      return json({ error: `Profile update failed: ${profileError.message}` }, 500);
    }

    // 7. Assign role, scoped to the caller's company
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({ user_id: newUserId, role, company_id: callerProfile.company_id });

    if (roleError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return json({ error: `Role assignment failed: ${roleError.message}` }, 500);
    }

    // 8. Audit log
    await adminClient.from('audit_logs').insert({
      entity_type: 'user',
      entity_id: newUserId,
      action: 'CREATE',
      actor_id: caller.id,
      company_id: callerProfile.company_id,
      after_data: { name, email, role, company_id: callerProfile.company_id },
    });

    return json({ user_id: newUserId, email, name, role });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
