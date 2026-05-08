import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';

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
    // 1. Authenticate the caller
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

    // 3. Get caller's company_id
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('company_id')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.company_id) return json({ error: 'Caller has no company assigned' }, 400);

    // 4. Parse request body
    const { user_id } = await req.json();
    if (!user_id) return json({ error: 'user_id is required' }, 400);

    // 5. Safety check: cannot delete yourself
    if (user_id === caller.id) return json({ error: 'Cannot delete your own account' }, 400);

    // 6. Verify the target user belongs to the same company (critical security check)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('company_id, name, email')
      .eq('id', user_id)
      .single();

    if (!targetProfile) return json({ error: 'User not found' }, 404);
    if (targetProfile.company_id !== callerProfile.company_id) {
      return json({ error: 'Forbidden: cannot delete users from another company' }, 403);
    }

    // 7. Audit log before deletion (entity will be gone after)
    await adminClient.from('audit_logs').insert({
      entity_type: 'user',
      entity_id: user_id,
      action: 'DELETE',
      actor_id: caller.id,
      company_id: callerProfile.company_id,
      before_data: { name: targetProfile.name, email: targetProfile.email },
      after_data: null,
    });

    // 8. Delete auth user — cascades to profiles (ON DELETE CASCADE) and user_roles
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
    if (deleteError) return json({ error: deleteError.message }, 500);

    return json({ deleted: true, user_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
