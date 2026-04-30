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
    // Validate platform token
    const platformToken = req.headers.get('X-Platform-Token');
    const expectedToken = Deno.env.get('PLATFORM_ADMIN_TOKEN');
    if (!platformToken || !expectedToken || platformToken !== expectedToken) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { action, payload } = await req.json();
    if (!action) return json({ error: 'action is required' }, 400);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (action === 'get_stats') {
      const [companiesRes, usersRes, projectsRes] = await Promise.all([
        adminClient.from('companies').select('id', { count: 'exact', head: true }),
        adminClient.from('profiles').select('id', { count: 'exact', head: true }),
        adminClient.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      ]);

      return json({
        total_companies: companiesRes.count ?? 0,
        total_users: usersRes.count ?? 0,
        active_projects: projectsRes.count ?? 0,
      });
    }

    if (action === 'get_all_companies') {
      const { data, error } = await adminClient
        .from('companies')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: false });

      if (error) return json({ error: error.message }, 500);
      return json(data ?? []);
    }

    if (action === 'get_company_detail') {
      const company_id = payload?.company_id;
      if (!company_id) return json({ error: 'payload.company_id is required' }, 400);

      const [profilesRes, rolesRes, projectsRes] = await Promise.all([
        adminClient
          .from('profiles')
          .select('id, name, email')
          .eq('company_id', company_id),
        adminClient
          .from('user_roles')
          .select('user_id, role')
          .eq('company_id', company_id),
        adminClient
          .from('projects')
          .select('id, project_number, site_name, status, created_at')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false }),
      ]);

      if (profilesRes.error) return json({ error: profilesRes.error.message }, 500);
      if (projectsRes.error) return json({ error: projectsRes.error.message }, 500);

      const roleMap = new Map(
        (rolesRes.data ?? []).map((r: { user_id: string; role: string }) => [r.user_id, r.role])
      );

      const users = (profilesRes.data ?? []).map((p: { id: string; name: string; email: string }) => ({
        id: p.id,
        full_name: p.name,
        email: p.email,
        role: roleMap.get(p.id) ?? 'UNASSIGNED',
      }));

      return json({ users, projects: projectsRes.data ?? [] });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
