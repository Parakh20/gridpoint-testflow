import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { logEdgeError } from '../_shared/monitoring.ts';
import { enforceRateLimit } from '../_shared/rate_limit.ts';
// No `@testflow/shared` package import precedent exists in supabase/functions
// (grep confirmed zero matches) and there is no Deno import map/deno.json to
// resolve a bare specifier — Deno has no bundler doing package.json "paths"
// resolution. billing.ts has no imports of its own, so a plain relative
// import resolves cleanly under Deno's native ESM loader.
import { ADDON_KEYS } from '../_shared/addon_keys.ts';

// Length-independent-ish equality so a wrong token can't be recovered by
// timing the response. The token is a shared secret guarding a full
// RLS-bypass surface — treat it like a password comparison.
function tokensMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

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

  // Service role client — bypasses RLS
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Throttle before the token check so a leaked/guessed token can't be brute
  // forced or used to bulk-exfiltrate every tenant at machine speed.
  const rl = await enforceRateLimit(adminClient, req, {
    key: 'platform-admin-data',
    limit: 300,
    windowMinutes: 60,
  }, corsHeaders);
  if (!rl.ok) return rl.response;

  // Auth check
  const token = req.headers.get('X-Platform-Token');
  const expected = Deno.env.get('PLATFORM_ADMIN_TOKEN');
  if (!token || !expected || !tokensMatch(token, expected)) {
    return respond({ error: 'Unauthorized' }, 401);
  }

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
      let { data, error } = await adminClient
        .from('companies')
        .select('id, name, slug, created_at, is_active, allowed_domains, oauth_provisioning')
        .order('created_at', { ascending: false });

      // Fallback: if the is_active column doesn't exist yet (migration pending),
      // re-query without it and default all companies to active.
      if (error?.message?.includes('is_active') || error?.code === '42703') {
        const fallback = await adminClient
          .from('companies')
          .select('id, name, slug, created_at')
          .order('created_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        data = (fallback.data ?? []).map((c: Record<string, unknown>) => ({
          ...c,
          is_active: true,
          allowed_domains: [],
          oauth_provisioning: 'off',
        }));
        error = null;
      }

      if (error) throw error;
      return respond({ companies: data ?? [] });
    }

    // ── toggle_company_status ──────────────────────────────────────────────────
    if (action === 'toggle_company_status') {
      const company_id = payload?.company_id as string | undefined;
      const is_active = payload?.is_active as boolean | undefined;
      if (!company_id || typeof is_active !== 'boolean') {
        return respond({ error: 'payload.company_id and payload.is_active (boolean) are required' });
      }

      // service_role bypasses RLS and all grant checks — direct update is fine.
      const { error } = await adminClient
        .from('companies')
        .update({ is_active })
        .eq('id', company_id);

      if (error) {
        console.error('toggle_company_status error:', JSON.stringify(error));
        return respond({ error: error.message ?? 'Failed to update company status' });
      }
      return respond({ success: true, is_active });
    }

    // ── delete_company ─────────────────────────────────────────────────────────
    // Cascades: deletes all auth users (→ profiles, user_roles), then projects
    // (→ scope_items, equipment_instances, test_tasks, test_records, etc.), then company.
    if (action === 'delete_company') {
      const company_id = payload?.company_id as string | undefined;
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);

      // 1. Delete all auth users belonging to this company.
      //    admin.deleteUser cascades to profiles + user_roles via FK ON DELETE CASCADE.
      const { data: profileRows, error: profileErr } = await adminClient
        .from('profiles')
        .select('id')
        .eq('company_id', company_id);
      if (profileErr) throw profileErr;

      const userIds = (profileRows ?? []).map((p: { id: string }) => p.id);
      for (const uid of userIds) {
        const { error: delErr } = await adminClient.auth.admin.deleteUser(uid);
        if (delErr) throw new Error(`Failed to delete user ${uid}: ${delErr.message}`);
      }

      // 2. Delete projects (FK cascade handles scope_items, equipment_instances,
      //    test_tasks, test_records, nameplate_records).
      const { error: projErr } = await adminClient
        .from('projects')
        .delete()
        .eq('company_id', company_id);
      if (projErr) throw projErr;

      // 3. Delete audit_logs and instruments that reference this company.
      await adminClient.from('audit_logs').delete().eq('company_id', company_id);
      await adminClient.from('instruments').delete().eq('company_id', company_id);

      // 4. Delete the company row itself.
      const { error: compErr } = await adminClient
        .from('companies')
        .delete()
        .eq('id', company_id);
      if (compErr) throw compErr;

      return respond({ success: true, deleted_users: userIds.length });
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
            redirectTo: "https://app.optimustesting.com/",
          },
        });

        if (linkError) throw linkError;

        console.log(`[PLATFORM ADMIN ACCESS] company_id=${company_id} slug=${slug} email=${email} at=${new Date().toISOString()}`);

        // Manually override redirect_to since Supabase ignores it
        const rawLink = linkData.properties.action_link;
        const url = new URL(rawLink);
        url.searchParams.set('redirect_to', "https://app.optimustesting.com/");
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

    // ── create_user_for_company ───────────────────────────────────────────────
    if (action === 'create_user_for_company') {
      const company_id = payload?.company_id as string | undefined;
      const name = payload?.name as string | undefined;
      const email = payload?.email as string | undefined;
      const password = payload?.password as string | undefined;
      const role = payload?.role as string | undefined;

      if (!company_id || !name || !email || !password || !role) {
        return respond({ error: 'payload.company_id, name, email, password, and role are required' }, 400);
      }
      const validRoles = ['SUPERADMIN', 'GM', 'SUPERVISOR', 'ENGINEER'];
      if (!validRoles.includes(role)) {
        return respond({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, 400);
      }

      const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createError) return respond({ error: createError.message }, 400);
      const newUserId = newUserData.user.id;

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ company_id, name })
        .eq('id', newUserId);
      if (profileError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return respond({ error: `Profile update failed: ${profileError.message}` }, 500);
      }

      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert({ user_id: newUserId, role, company_id });
      if (roleError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        return respond({ error: `Role assignment failed: ${roleError.message}` }, 500);
      }

      return respond({ user_id: newUserId, email, name, role });
    }

    // ── set_company_oauth_config ───────────────────────────────────────────────
    if (action === 'set_company_oauth_config') {
      const company_id = payload?.company_id as string | undefined;
      const allowed_domains = payload?.allowed_domains as string[] | undefined;
      const oauth_provisioning = payload?.oauth_provisioning as string | undefined;
      if (!company_id || !Array.isArray(allowed_domains) || !oauth_provisioning) {
        return respond({ error: 'company_id, allowed_domains, and oauth_provisioning are required' }, 400);
      }
      if (!['off', 'auto', 'pending'].includes(oauth_provisioning)) {
        return respond({ error: 'oauth_provisioning must be off, auto, or pending' }, 400);
      }
      const { error } = await adminClient
        .from('companies')
        .update({ allowed_domains, oauth_provisioning })
        .eq('id', company_id);
      if (error) return respond({ error: error.message }, 500);
      return respond({ success: true });
    }

    // ── get_all_leads ──────────────────────────────────────────────────────────
    // Optional filters: { stage, priority, search }. Each lead is augmented with
    // last_activity_at + activity_count (aggregated client-side to avoid N+1).
    if (action === 'get_all_leads') {
      const stage = payload?.stage as string | undefined;
      const priority = payload?.priority as number | undefined;
      const search = payload?.search as string | undefined;

      let query = adminClient
        .from('leads')
        .select('*')
        .order('priority', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false });

      if (stage) query = query.eq('stage', stage);
      if (typeof priority === 'number') query = query.eq('priority', priority);
      if (search) query = query.ilike('company_name', `%${search}%`);

      const { data: leads, error } = await query;
      if (error) throw error;

      const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
      const activityMap = new Map<string, { count: number; last: string }>();
      if (leadIds.length > 0) {
        const { data: acts, error: actErr } = await adminClient
          .from('lead_activities')
          .select('lead_id, occurred_at')
          .in('lead_id', leadIds);
        if (actErr) throw actErr;
        for (const a of (acts ?? []) as { lead_id: string; occurred_at: string }[]) {
          const cur = activityMap.get(a.lead_id);
          if (!cur) {
            activityMap.set(a.lead_id, { count: 1, last: a.occurred_at });
          } else {
            cur.count += 1;
            if (a.occurred_at > cur.last) cur.last = a.occurred_at;
          }
        }
      }

      const enriched = (leads ?? []).map((l: { id: string }) => {
        const agg = activityMap.get(l.id);
        return { ...l, activity_count: agg?.count ?? 0, last_activity_at: agg?.last ?? null };
      });

      return respond({ leads: enriched });
    }

    // ── get_lead_detail ────────────────────────────────────────────────────────
    if (action === 'get_lead_detail') {
      const lead_id = payload?.lead_id as string | undefined;
      if (!lead_id) return respond({ error: 'payload.lead_id is required' }, 400);

      const [leadRes, actsRes, contactsRes] = await Promise.all([
        adminClient.from('leads').select('*').eq('id', lead_id).single(),
        adminClient
          .from('lead_activities')
          .select('*')
          .eq('lead_id', lead_id)
          .order('occurred_at', { ascending: false }),
        adminClient
          .from('lead_contacts')
          .select('*')
          .eq('lead_id', lead_id)
          .order('is_primary', { ascending: false })
          .order('seniority', { ascending: true }),
      ]);
      if (leadRes.error) throw leadRes.error;
      if (actsRes.error) throw actsRes.error;
      if (contactsRes.error) throw contactsRes.error;

      return respond({
        lead: leadRes.data,
        activities: actsRes.data ?? [],
        contacts: contactsRes.data ?? [],
      });
    }

    // ── create_lead ────────────────────────────────────────────────────────────
    if (action === 'create_lead') {
      const fields = (payload?.fields ?? {}) as Record<string, unknown>;
      const company_name = fields.company_name as string | undefined;
      if (!company_name || !company_name.trim()) {
        return respond({ error: 'fields.company_name is required' }, 400);
      }

      const ALLOWED = [
        'company_name', 'segment', 'region', 'size_signal', 'why_fit', 'buyer_title',
        'contact_name', 'contact_phone', 'contact_email', 'outreach_approach',
        'priority', 'confidence', 'source_url', 'stage', 'next_action_date', 'notes', 'company_id',
      ];
      const insert: Record<string, unknown> = {};
      for (const k of ALLOWED) {
        if (fields[k] !== undefined) insert[k] = fields[k];
      }

      const { data, error } = await adminClient.from('leads').insert(insert).select('*').single();
      if (error) return respond({ error: error.message }, 400);
      return respond({ lead: data });
    }

    // ── update_lead ────────────────────────────────────────────────────────────
    if (action === 'update_lead') {
      const lead_id = payload?.lead_id as string | undefined;
      const fields = (payload?.fields ?? {}) as Record<string, unknown>;
      if (!lead_id) return respond({ error: 'payload.lead_id is required' }, 400);

      const ALLOWED = [
        'segment', 'region', 'size_signal', 'why_fit', 'buyer_title',
        'contact_name', 'contact_phone', 'contact_email', 'outreach_approach',
        'priority', 'confidence', 'source_url', 'stage', 'next_action_date', 'notes', 'company_id',
      ];
      const update: Record<string, unknown> = {};
      for (const k of ALLOWED) {
        if (fields[k] !== undefined) update[k] = fields[k];
      }
      if (Object.keys(update).length === 0) {
        return respond({ error: 'No updatable fields provided' }, 400);
      }

      const { data, error } = await adminClient
        .from('leads')
        .update(update)
        .eq('id', lead_id)
        .select('*')
        .single();
      if (error) return respond({ error: error.message }, 400);
      return respond({ lead: data });
    }

    // ── add_lead_activity ──────────────────────────────────────────────────────
    if (action === 'add_lead_activity') {
      const lead_id = payload?.lead_id as string | undefined;
      const channel = payload?.channel as string | undefined;
      const body = payload?.body as string | undefined;
      const occurred_at = payload?.occurred_at as string | undefined;

      const VALID_CHANNELS = ['WHATSAPP', 'PHONE', 'LINKEDIN', 'EMAIL', 'IN_PERSON', 'EVENT', 'NOTE'];
      if (!lead_id || !channel || !body || !body.trim()) {
        return respond({ error: 'payload.lead_id, channel, and body are required' }, 400);
      }
      if (!VALID_CHANNELS.includes(channel)) {
        return respond({ error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` }, 400);
      }

      const insert: Record<string, unknown> = { lead_id, channel, body };
      if (occurred_at) insert.occurred_at = occurred_at;

      const { data, error } = await adminClient
        .from('lead_activities')
        .insert(insert)
        .select('*')
        .single();
      if (error) return respond({ error: error.message }, 400);

      // Bump the parent lead's updated_at so it surfaces as recently touched.
      await adminClient.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', lead_id);

      return respond({ activity: data });
    }

    // ── upsert_lead_contact ────────────────────────────────────────────────────
    // Contact book for a lead (many contacts per company: MD, Head of T&C, ...).
    // Keyed on (lead_id, lower(email)) so re-running an enrichment pass updates
    // instead of duplicating. Setting is_primary also mirrors the contact onto
    // leads.contact_* so existing single-contact readers stay correct.
    if (action === 'upsert_lead_contact') {
      const lead_id = payload?.lead_id as string | undefined;
      const fields = (payload?.fields ?? {}) as Record<string, unknown>;
      if (!lead_id) return respond({ error: 'payload.lead_id is required' }, 400);

      const email = typeof fields.email === 'string' ? fields.email.trim().toLowerCase() : null;
      if (!email && !fields.full_name) {
        return respond({ error: 'fields.email or fields.full_name is required' }, 400);
      }

      const ALLOWED = [
        'full_name', 'title', 'seniority', 'email', 'email_status',
        'phone', 'linkedin_url', 'source_url', 'is_primary', 'notes',
      ];
      const row: Record<string, unknown> = { lead_id };
      for (const k of ALLOWED) {
        if (fields[k] !== undefined) row[k] = fields[k];
      }
      if (email) row.email = email;

      // Look for an existing row on this lead with the same email.
      let existingId: string | null = null;
      if (email) {
        const { data: found, error: findErr } = await adminClient
          .from('lead_contacts')
          .select('id')
          .eq('lead_id', lead_id)
          .ilike('email', email)
          .maybeSingle();
        if (findErr) return respond({ error: findErr.message }, 400);
        existingId = found?.id ?? null;
      }

      // Only one primary per lead — demote the others first.
      if (row.is_primary === true) {
        await adminClient
          .from('lead_contacts')
          .update({ is_primary: false })
          .eq('lead_id', lead_id)
          .neq('id', existingId ?? '00000000-0000-0000-0000-000000000000');
      }

      const written = existingId
        ? await adminClient.from('lead_contacts').update(row).eq('id', existingId).select('*').single()
        : await adminClient.from('lead_contacts').insert(row).select('*').single();
      if (written.error) return respond({ error: written.error.message }, 400);

      if (row.is_primary === true) {
        await adminClient.from('leads').update({
          contact_name: written.data.full_name,
          contact_email: written.data.email,
          contact_phone: written.data.phone,
        }).eq('id', lead_id);
      }

      return respond({ contact: written.data });
    }

    // ── delete_lead_contact ────────────────────────────────────────────────────
    if (action === 'delete_lead_contact') {
      const contact_id = payload?.contact_id as string | undefined;
      if (!contact_id) return respond({ error: 'payload.contact_id is required' }, 400);
      const { error } = await adminClient.from('lead_contacts').delete().eq('id', contact_id);
      if (error) return respond({ error: error.message }, 400);
      return respond({ success: true });
    }

    // ── get_billing_overview ────────────────────────────────────────────────────
    // Aggregate MRR/ARR/status counts across all subscriptions. MRR sums the
    // monthly-equivalent of every active/trialing sub (annual subs divide by 12).
    if (action === 'get_billing_overview') {
      const { data: subs, error } = await adminClient
        .from('subscriptions')
        .select('status, billing_interval, discount_pct, plan_id, plans:plan_id(monthly_price_inr, annual_price_inr)');
      if (error) throw error;

      let mrr = 0;
      let active_count = 0, trialing_count = 0, past_due_count = 0, cancelled_count = 0;
      for (const s of (subs ?? []) as any[]) {
        if (s.status === 'active') active_count++;
        else if (s.status === 'trialing') trialing_count++;
        else if (s.status === 'past_due') past_due_count++;
        else if (s.status === 'cancelled') cancelled_count++;

        if ((s.status === 'active' || s.status === 'past_due') && s.plans) {
          const monthly = s.billing_interval === 'annual'
            ? (s.plans.annual_price_inr ?? 0) / 12
            : (s.plans.monthly_price_inr ?? 0);
          const discountMultiplier = 1 - (s.discount_pct ?? 0) / 100;
          mrr += monthly * discountMultiplier;
        }
      }

      return respond({ mrr, arr: mrr * 12, active_count, trialing_count, past_due_count, cancelled_count });
    }

    // ── get_all_subscriptions ───────────────────────────────────────────────────
    if (action === 'get_all_subscriptions') {
      const { data, error } = await adminClient
        .from('subscriptions')
        .select(`
          id, company_id, status, billing_interval, current_period_end,
          seat_count, discount_pct, credit_balance_inr,
          companies:company_id(name, slug),
          plans:plan_id(slug, name, monthly_price_inr, annual_price_inr, max_users, max_active_projects)
        `)
        .order('current_period_end', { ascending: true, nullsFirst: false });
      if (error) throw error;

      return respond({ subscriptions: data ?? [] });
    }

    // ── admin_change_plan ───────────────────────────────────────────────────────
    if (action === 'admin_change_plan') {
      const company_id = payload?.company_id as string | undefined;
      const plan_slug = payload?.plan_slug as string | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id || !plan_slug) {
        return respond({ error: 'payload.company_id and payload.plan_slug are required' }, 400);
      }

      const { data: plan, error: planErr } = await adminClient
        .from('plans').select('id, slug').eq('slug', plan_slug).single();
      if (planErr || !plan) return respond({ error: `Unknown plan slug: ${plan_slug}` }, 400);

      const { data: before } = await adminClient
        .from('subscriptions').select('plan_id, plans:plan_id(slug)').eq('company_id', company_id).maybeSingle();

      // Clear any tenant-scheduled downgrade — an admin-driven plan change
      // takes effect immediately and must win over a stale pending_plan_id,
      // otherwise the next webhook-driven period rollover (upsert_subscription)
      // silently reverts this change back to whatever the tenant had queued.
      const { data: updated, error } = await adminClient
        .from('subscriptions')
        .update({
          plan_id: plan.id,
          pending_plan_id: null,
          pending_plan_requested_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', company_id)
        .select('*')
        .maybeSingle();
      if (error) return respond({ error: error.message }, 400);
      if (!updated) return respond({ error: 'No subscription row exists for this company yet' }, 404);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'PLAN_CHANGED',
        old_value: { plan_slug: (before as any)?.plans?.slug ?? null },
        new_value: { plan_slug },
      });

      return respond({ subscription: updated });
    }

    // ── admin_grant_trial ───────────────────────────────────────────────────────
    if (action === 'admin_grant_trial') {
      const company_id = payload?.company_id as string | undefined;
      const days = (payload?.days as number | undefined) ?? 14;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);
      if (typeof days !== 'number' || days <= 0 || days > 365) {
        return respond({ error: 'payload.days must be a positive number, max 365' }, 400);
      }

      const { data: before } = await adminClient.from('companies').select('trial_ends_at').eq('id', company_id).single();
      const newTrialEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await adminClient.from('companies').update({ trial_ends_at: newTrialEnd }).eq('id', company_id);
      if (error) return respond({ error: error.message }, 400);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'TRIAL_GRANTED',
        old_value: { trial_ends_at: before?.trial_ends_at ?? null },
        new_value: { trial_ends_at: newTrialEnd },
        metadata: { days },
      });

      return respond({ trial_ends_at: newTrialEnd });
    }

    // ── admin_extend_trial ──────────────────────────────────────────────────────
    if (action === 'admin_extend_trial') {
      const company_id = payload?.company_id as string | undefined;
      const additional_days = (payload?.additional_days as number | undefined) ?? 7;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);
      if (typeof additional_days !== 'number' || additional_days <= 0 || additional_days > 365) {
        return respond({ error: 'payload.additional_days must be a positive number, max 365' }, 400);
      }

      const { data: before, error: beforeErr } = await adminClient
        .from('companies').select('trial_ends_at').eq('id', company_id).single();
      if (beforeErr) return respond({ error: beforeErr.message }, 400);

      // Extend from the LATER of (current trial_ends_at, now) — extending an
      // already-expired trial should start counting from today, not compound
      // onto a past date.
      const base = before?.trial_ends_at && new Date(before.trial_ends_at).getTime() > Date.now()
        ? new Date(before.trial_ends_at)
        : new Date();
      const newTrialEnd = new Date(base.getTime() + additional_days * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await adminClient.from('companies').update({ trial_ends_at: newTrialEnd }).eq('id', company_id);
      if (error) return respond({ error: error.message }, 400);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'TRIAL_EXTENDED',
        old_value: { trial_ends_at: before?.trial_ends_at ?? null },
        new_value: { trial_ends_at: newTrialEnd },
        metadata: { additional_days },
      });

      return respond({ trial_ends_at: newTrialEnd });
    }

    // ── admin_apply_discount ────────────────────────────────────────────────────
    if (action === 'admin_apply_discount') {
      const company_id = payload?.company_id as string | undefined;
      const discount_pct = payload?.discount_pct as number | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id || typeof discount_pct !== 'number') {
        return respond({ error: 'payload.company_id and payload.discount_pct (number) are required' }, 400);
      }
      if (discount_pct < 0 || discount_pct > 100) {
        return respond({ error: 'payload.discount_pct must be between 0 and 100' }, 400);
      }

      const { data: before } = await adminClient.from('subscriptions').select('discount_pct').eq('company_id', company_id).maybeSingle();
      const { data: updated, error } = await adminClient
        .from('subscriptions').update({ discount_pct }).eq('company_id', company_id).select('*').maybeSingle();
      if (error) return respond({ error: error.message }, 400);
      if (!updated) return respond({ error: 'No subscription row exists for this company yet' }, 404);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'DISCOUNT_APPLIED',
        old_value: { discount_pct: before?.discount_pct ?? null },
        new_value: { discount_pct },
      });

      return respond({ subscription: updated });
    }

    // ── admin_add_credits ───────────────────────────────────────────────────────
    if (action === 'admin_add_credits') {
      const company_id = payload?.company_id as string | undefined;
      const amount_inr = payload?.amount_inr as number | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id || typeof amount_inr !== 'number' || amount_inr <= 0) {
        return respond({ error: 'payload.company_id and a positive payload.amount_inr are required' }, 400);
      }

      const { data: before } = await adminClient.from('subscriptions').select('credit_balance_inr').eq('company_id', company_id).maybeSingle();
      if (!before) return respond({ error: 'No subscription row exists for this company yet' }, 404);

      const newBalance = (before.credit_balance_inr ?? 0) + amount_inr;
      const { data: updated, error } = await adminClient
        .from('subscriptions').update({ credit_balance_inr: newBalance }).eq('company_id', company_id).select('*').maybeSingle();
      if (error) return respond({ error: error.message }, 400);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'CREDITS_ADDED',
        old_value: { credit_balance_inr: before.credit_balance_inr ?? 0 },
        new_value: { credit_balance_inr: newBalance },
        metadata: { amount_inr },
      });

      return respond({ subscription: updated });
    }

    // ── admin_suspend_account ───────────────────────────────────────────────────
    if (action === 'admin_suspend_account') {
      const company_id = payload?.company_id as string | undefined;
      const reason = payload?.reason as string | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);

      const { data: before } = await adminClient.from('companies').select('is_active').eq('id', company_id).single();

      const { error } = await adminClient.from('companies').update({ is_active: false }).eq('id', company_id);
      if (error) return respond({ error: error.message }, 400);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'SUBSCRIPTION_SUSPENDED',
        old_value: { is_active: before?.is_active ?? null }, new_value: { is_active: false },
        metadata: reason ? { reason } : {},
      });

      return respond({ success: true });
    }

    // ── admin_reactivate_account ────────────────────────────────────────────────
    if (action === 'admin_reactivate_account') {
      const company_id = payload?.company_id as string | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);

      const { data: before } = await adminClient.from('companies').select('is_active').eq('id', company_id).single();

      const { error } = await adminClient.from('companies').update({ is_active: true }).eq('id', company_id);
      if (error) return respond({ error: error.message }, 400);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'SUBSCRIPTION_REACTIVATED',
        old_value: { is_active: before?.is_active ?? null }, new_value: { is_active: true },
      });

      return respond({ success: true });
    }

    // ── admin_create_enterprise_contract ────────────────────────────────────────
    // Depends on Plan 6's enterprise_contracts table. Degrades gracefully with a
    // clear error if that table doesn't exist yet, rather than a raw Postgres
    // "relation does not exist" error.
    if (action === 'admin_create_enterprise_contract') {
      const company_id = payload?.company_id as string | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);

      const fields = (payload?.fields ?? {}) as Record<string, unknown>;
      const { data, error } = await adminClient
        .from('enterprise_contracts')
        .insert({ company_id, ...fields })
        .select('*')
        .single();

      if (error) {
        if (error.code === '42P01' /* undefined_table */) {
          return respond({ error: 'Enterprise contracts not yet available — requires the enterprise-contracts plan to land first' }, 501);
        }
        return respond({ error: error.message }, 400);
      }

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'ENTERPRISE_CONTRACT_CREATED',
        old_value: null, new_value: data,
      });

      return respond({ contract: data });
    }

    // ── get_subscription_detail ─────────────────────────────────────────────────
    if (action === 'get_subscription_detail') {
      const company_id = payload?.company_id as string | undefined;
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);

      const [subRes, auditRes] = await Promise.all([
        adminClient
          .from('subscriptions')
          .select(`*, companies:company_id(name, slug, is_active), plans:plan_id(slug, name, monthly_price_inr, annual_price_inr, max_users, max_active_projects)`)
          .eq('company_id', company_id)
          .maybeSingle(),
        adminClient
          .from('billing_audit_logs')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (subRes.error) throw subRes.error;
      if (auditRes.error) throw auditRes.error;

      return respond({ subscription: subRes.data, audit_log: auditRes.data ?? [] });
    }

    // ── get_billing_extras ────────────────────────────────────────────────────
    // Reads the company's active enterprise contract (if any) and all its
    // subscription add-ons (active + cancelled, so the admin UI can show
    // history) in one round trip. Mirrors get_subscription_detail's shape —
    // degrades gracefully (empty results, not an error) if enterprise_contracts
    // has no row for this company, which is the normal case for non-Enterprise
    // tenants.
    if (action === 'get_billing_extras') {
      const company_id = payload?.company_id as string | undefined;
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);

      const nowIso = new Date().toISOString();
      const [contractRes, subRes] = await Promise.all([
        adminClient
          .from('enterprise_contracts')
          .select('*')
          .eq('company_id', company_id)
          .lte('contract_start', nowIso)
          .or(`contract_end.is.null,contract_end.gte.${nowIso}`)
          .order('contract_start', { ascending: false })
          .limit(1)
          .maybeSingle(),
        adminClient
          .from('subscriptions')
          .select('id')
          .eq('company_id', company_id)
          .maybeSingle(),
      ]);

      if (contractRes.error && contractRes.error.code !== '42P01') throw contractRes.error;
      if (subRes.error) throw subRes.error;

      let addons: unknown[] = [];
      if (subRes.data?.id) {
        const addonRes = await adminClient
          .from('subscription_addons')
          .select('*')
          .eq('subscription_id', subRes.data.id)
          .order('created_at', { ascending: false });
        if (addonRes.error && addonRes.error.code !== '42P01') throw addonRes.error;
        addons = addonRes.data ?? [];
      }

      return respond({ contract: contractRes.data ?? null, addons });
    }

    // ── admin_create_addon ────────────────────────────────────────────────────
    if (action === 'admin_create_addon') {
      const company_id = payload?.company_id as string | undefined;
      const addon_key = payload?.addon_key as string | undefined;
      const quantity = Number(payload?.quantity ?? 0);
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);
      if (!addon_key || !ADDON_KEYS.includes(addon_key as (typeof ADDON_KEYS)[number])) {
        return respond({ error: `payload.addon_key must be one of: ${ADDON_KEYS.join(', ')}` }, 400);
      }
      if (!Number.isFinite(quantity) || quantity < 0) {
        return respond({ error: 'payload.quantity must be a non-negative number' }, 400);
      }

      const { data: sub, error: subError } = await adminClient
        .from('subscriptions')
        .select('id')
        .eq('company_id', company_id)
        .maybeSingle();
      if (subError) throw subError;
      if (!sub) return respond({ error: 'Company has no subscription row — cannot attach an add-on' }, 400);

      const { data, error } = await adminClient
        .from('subscription_addons')
        .insert({ subscription_id: sub.id, addon_key, quantity, unit_price_inr: payload?.unit_price_inr ?? null })
        .select('*')
        .single();

      if (error) {
        if (error.code === '42P01') return respond({ error: 'Subscription add-ons not yet available' }, 501);
        return respond({ error: error.message }, 400);
      }

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'ADDON_CREATED', old_value: null, new_value: data,
      });

      return respond({ addon: data });
    }

    // ── admin_cancel_addon ─────────────────────────────────────────────────────
    if (action === 'admin_cancel_addon') {
      const addon_id = payload?.addon_id as string | undefined;
      const company_id = payload?.company_id as string | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!addon_id) return respond({ error: 'payload.addon_id is required' }, 400);

      const { data: before, error: beforeError } = await adminClient
        .from('subscription_addons')
        .select('*')
        .eq('id', addon_id)
        .maybeSingle();
      if (beforeError) return respond({ error: beforeError.message }, 400);

      const { data, error } = await adminClient
        .from('subscription_addons')
        .update({ status: 'cancelled' })
        .eq('id', addon_id)
        .select('*')
        .single();

      if (error) return respond({ error: error.message }, 400);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id: company_id ?? null, action: 'ADDON_CANCELLED', old_value: before ?? null, new_value: data,
      });

      return respond({ addon: data });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('platform-admin-data', 'api_error', err, { action });
    return respond({ error: message }, 500);
  }
});
