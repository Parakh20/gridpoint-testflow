import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // Auth check
  const token = req.headers.get('X-Platform-Token');
  const expected = Deno.env.get('PLATFORM_ADMIN_TOKEN');
  if (!token || token !== expected) {
    return respond({ error: 'Unauthorized' }, 401);
  }

  // Service role client — bypasses RLS
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let action: string;
  let payload: Record<string, unknown> | undefined;

  try {
    const body = await req.json();
    action = body.action;
    payload = body.payload;
  } catch {
    return respond({ error: 'Invalid JSON body' }, 400);
  }

  if (!action) return respond({ error: 'action is required' }, 400);

  try {
    // ── get_stats ──────────────────────────────────────────────────────────────
    if (action === 'get_stats') {
      const [companies, users, projects] = await Promise.all([
        adminClient.from('companies').select('*', { count: 'exact', head: true }),
        adminClient.from('profiles').select('*', { count: 'exact', head: true }),
        adminClient.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      ]);
      return respond({
        total_companies: companies.count ?? 0,
        total_users: users.count ?? 0,
        active_projects: projects.count ?? 0,
      });
    }

    // ── get_all_companies ──────────────────────────────────────────────────────
    if (action === 'get_all_companies') {
      const { data, error } = await adminClient
        .from('companies')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return respond({ companies: data ?? [] });
    }

    // ── get_company_detail ─────────────────────────────────────────────────────
    if (action === 'get_company_detail') {
      const company_id = payload?.company_id as string | undefined;
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);

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

      if (profilesRes.error) throw profilesRes.error;
      if (projectsRes.error) throw projectsRes.error;

      const roleMap = new Map(
        (rolesRes.data ?? []).map((r: { user_id: string; role: string }) => [r.user_id, r.role])
      );

      const users = (profilesRes.data ?? []).map((p: { id: string; name: string; email: string }) => ({
        id: p.id,
        full_name: p.name,
        email: p.email,
        role: roleMap.get(p.id) ?? 'UNASSIGNED',
      }));

      return respond({ users, projects: projectsRes.data ?? [] });
    }

    // ── get_all_users ──────────────────────────────────────────────────────────
    if (action === 'get_all_users') {
      const [profilesRes, rolesRes, companiesRes] = await Promise.all([
        adminClient
          .from('profiles')
          .select('id, name, email, company_id, created_at')
          .order('created_at', { ascending: false }),
        adminClient
          .from('user_roles')
          .select('user_id, role'),
        adminClient
          .from('companies')
          .select('id, name, slug'),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const roleMap = new Map(
        (rolesRes.data ?? []).map((r: { user_id: string; role: string }) => [r.user_id, r.role])
      );
      const companyMap = new Map(
        (companiesRes.data ?? []).map((c: { id: string; name: string; slug: string }) => [c.id, c])
      );

      const users = (profilesRes.data ?? []).map((p: { id: string; name: string; email: string; company_id: string | null }) => {
        const company = p.company_id ? companyMap.get(p.company_id) : null;
        return {
          id: p.id,
          full_name: p.name,
          email: p.email,
          company_id: p.company_id ?? null,
          company_name: company?.name ?? null,
          company_slug: company?.slug ?? null,
          role: roleMap.get(p.id) ?? 'UNASSIGNED',
        };
      });

      return respond({ users });
    }

    // ── reset_user_password ────────────────────────────────────────────────────
    if (action === 'reset_user_password') {
      const email = payload?.email as string | undefined;
      if (!email) return respond({ error: 'payload.email is required' }, 400);

      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email,
      });

      if (error) return respond({ error: error.message }, 400);

      return respond({
        success: true,
        link: data.properties.action_link,
      });
    }

    // ── get_company_magic_link ─────────────────────────────────────────────────
    if (action === 'get_company_magic_link') {
      const company_id = payload?.company_id as string | undefined;
      const slug = payload?.slug as string | undefined;
      if (!company_id || !slug) {
        return respond({ error: 'payload.company_id and payload.slug are required' }, 400);
      }

      // Find SUPERADMIN for this company
      const { data: roleData, error: roleError } = await adminClient
        .from('user_roles')
        .select('user_id, profiles(email)')
        .eq('company_id', company_id)
        .eq('role', 'SUPERADMIN')
        .limit(1)
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData) {
        return respond({
          error: 'no_superadmin',
          message: 'No SUPERADMIN found for this company. Create one first via the Create Company + Admin form.',
        }, 404);
      }

      const adminEmail = (roleData.profiles as unknown as { email: string })?.email;
      if (!adminEmail) {
        return respond({ error: 'Could not resolve SUPERADMIN email' }, 500);
      }

      // Generate magic link — redirects to the tenant workspace
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: adminEmail,
        options: {
          redirectTo: `https://${slug}.optimustesting.com`,
        },
      });

      if (linkError) return respond({ error: linkError.message }, 500);

      // Audit trail in Edge Function logs
      console.log(
        `[PLATFORM ADMIN ACCESS] company_id=${company_id} slug=${slug} email=${adminEmail} at=${new Date().toISOString()}`
      );

      return respond({
        magic_link: linkData.properties.action_link,
        email: adminEmail,
        slug,
      });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return respond({ error: message }, 500);
  }
});
