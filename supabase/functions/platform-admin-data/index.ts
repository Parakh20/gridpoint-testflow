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

      const [profilesRes, projectsRes] = await Promise.all([
        adminClient
          .from('profiles')
          .select('id, name, email')
          .eq('company_id', company_id),
        adminClient
          .from('projects')
          .select('id, project_number, site_name, status, created_at')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (projectsRes.error) throw projectsRes.error;

      const profileIds = (profilesRes.data ?? []).map((p: { id: string }) => p.id);

      // Fetch roles: first by company_id, then fallback to user_id IN for older tenants
      let rolesData: { user_id: string; role: string }[] = [];
      if (profileIds.length > 0) {
        const { data: byCompany } = await adminClient
          .from('user_roles')
          .select('user_id, role')
          .eq('company_id', company_id);

        if (byCompany && byCompany.length > 0) {
          rolesData = byCompany;
        } else {
          const { data: byUserId } = await adminClient
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', profileIds);
          rolesData = byUserId ?? [];
        }
      }

      const roleMap = new Map(rolesData.map((r) => [r.user_id, r.role]));

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

      try {
        console.log('Step 1: finding SUPERADMIN for', company_id);

        // First try matching by user_roles.company_id (set for tenants created via create-tenant)
        let superadminUserId: string | null = null;

        const { data: roleData, error: roleError } = await adminClient
          .from('user_roles')
          .select('user_id')
          .eq('company_id', company_id)
          .eq('role', 'SUPERADMIN')
          .limit(1)
          .maybeSingle();

        console.log('Step 2: roleData =', JSON.stringify(roleData));

        if (!roleError && roleData) {
          superadminUserId = roleData.user_id;
        } else {
          // Fallback: find users in this company via profiles.company_id, then check role
          const { data: profileIds } = await adminClient
            .from('profiles')
            .select('id')
            .eq('company_id', company_id);

          if (profileIds && profileIds.length > 0) {
            const ids = profileIds.map((p: { id: string }) => p.id);
            const { data: fallbackRole } = await adminClient
              .from('user_roles')
              .select('user_id')
              .in('user_id', ids)
              .eq('role', 'SUPERADMIN')
              .limit(1)
              .maybeSingle();
            if (fallbackRole) superadminUserId = fallbackRole.user_id;
          }
        }

        if (!superadminUserId) {
          return respond({
            error: 'no_superadmin',
            message: 'No SUPERADMIN found for this company. Create one first via the Create Company + Admin form.',
          });
        }

        const { data: profileData, error: profileError } = await adminClient
          .from('profiles')
          .select('email')
          .eq('id', superadminUserId)
          .single();

        if (profileError || !profileData?.email) {
          return respond({ error: 'Could not resolve SUPERADMIN email' }, 500);
        }

        const email = profileData.email;
        console.log('Step 3: email =', email);
        console.log('Step 4: generating magic link for', email);

        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: `https://${slug}.optimustesting.com/`,
          },
        });

        if (linkError) throw linkError;

        console.log(`[PLATFORM ADMIN ACCESS] company_id=${company_id} slug=${slug} email=${email} at=${new Date().toISOString()}`);

        // Manually override redirect_to since Supabase ignores it
        const rawLink = linkData.properties.action_link;
        const url = new URL(rawLink);
        url.searchParams.set('redirect_to', `https://${slug}.optimustesting.com/`);
        const fixedLink = url.toString();

        console.log('Step 5: raw redirect_to =', linkData.properties.action_link);
        console.log('Step 5: fixed link =', fixedLink);

        return respond({
          magic_link: fixedLink,
          email,
          slug,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('get_company_magic_link error:', message, err);
        return new Response(
          JSON.stringify({ error: message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return respond({ error: message }, 500);
  }
});
