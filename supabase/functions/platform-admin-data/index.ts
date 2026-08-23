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
import { PLAN_FEATURE_KEYS, COMPANY_FEATURE_FLAGS } from '../_shared/feature_keys.ts';
import { RazorpayBillingProvider, razorpayKeyMode } from '../_shared/billing_provider.ts';
import { resendFrom } from '../_shared/email.ts';
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_KEYS, isTemplateKey } from '../_shared/email_templates.ts';

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

// ─── Plan catalog helpers ────────────────────────────────────────────────────

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Shared validation for create_plan / update_plan. Returns an error string, or
 * null when the payload is acceptable. Kept deliberately strict: these rows
 * drive both the public pricing page and every entitlement check, and there is
 * no second line of defence — the table's only constraint is UNIQUE(slug).
 */
function validatePlanInput(
  payload: Record<string, unknown> | undefined,
  opts: { requireSlug: boolean }
): string | null {
  if (opts.requireSlug) {
    const slug = payload?.slug;
    if (typeof slug !== 'string' || !SLUG_RE.test(slug.trim())) {
      return 'payload.slug must be lowercase alphanumeric words separated by single hyphens';
    }
  }
  const name = payload?.name;
  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 80) {
    return 'payload.name is required (1-80 characters)';
  }
  if (payload?.description != null && typeof payload.description !== 'string') {
    return 'payload.description must be a string or null';
  }

  const isCustom = payload?.is_custom === true;
  for (const key of ['monthly_price_inr', 'annual_price_inr'] as const) {
    const raw = payload?.[key];
    if (raw === null || raw === undefined || raw === '') {
      // A NULL price is only meaningful on a custom (quote-only) plan —
      // anywhere else it makes the plan unbuyable while still being listed.
      if (!isCustom) return `payload.${key} is required unless the plan is marked custom`;
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 99_999_999) {
      return `payload.${key} must be a number between 0 and 99999999`;
    }
  }

  for (const key of ['max_users', 'max_active_projects'] as const) {
    const raw = payload?.[key];
    if (raw === null || raw === undefined || raw === '') continue; // NULL = unlimited
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 100_000) {
      return `payload.${key} must be a whole number between 1 and 100000, or blank for unlimited`;
    }
  }

  for (const key of ['is_custom', 'is_active', 'is_public'] as const) {
    if (payload?.[key] !== undefined && typeof payload[key] !== 'boolean') {
      return `payload.${key} must be a boolean`;
    }
  }
  return null;
}

/**
 * Write the freshly-created Razorpay plan ids onto plan_provider_mapping,
 * recording the price and mode they correspond to. Ids for an interval that
 * wasn't (re)created are carried forward from the previous mapping unchanged,
 * along with the price recorded for them.
 */
async function persistMapping(
  adminClient: { from: (t: string) => any },
  plan: Record<string, any>,
  before: Record<string, any> | null,
  created: Record<string, string>,
  keyId: string,
  actor: string,
  outcome: 'created' | 'partial'
) {
  const monthlyId = created.monthly ?? before?.razorpay_plan_id_monthly ?? null;
  const annualId = created.annual ?? before?.razorpay_plan_id_annual ?? null;

  const { data, error } = await adminClient
    .from('plan_provider_mapping')
    .upsert({
      plan_id: plan.id,
      razorpay_plan_id_monthly: monthlyId,
      razorpay_plan_id_annual: annualId,
      monthly_price_inr_at_mapping: created.monthly
        ? plan.monthly_price_inr
        : (before?.monthly_price_inr_at_mapping ?? null),
      annual_price_inr_at_mapping: created.annual
        ? plan.annual_price_inr
        : (before?.annual_price_inr_at_mapping ?? null),
      provider_mode: razorpayKeyMode(keyId),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'plan_id' })
    .select('*')
    .single();
  if (error) throw error;

  await adminClient.from('billing_audit_logs').insert({
    actor, company_id: null, action: 'PLAN_PROVIDER_MAPPING_UPDATED',
    old_value: before ?? null, new_value: data,
    metadata: { source: 'razorpay_create', outcome, created },
  });

  return data;
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

    // ── get_selfserve_signups ──────────────────────────────────────────────────
    // Self-serve /start-trial means a company can now exist with no lead row
    // behind it, because nobody ever worked it. The sales pipeline silently
    // under-counts those. Rather than fabricate a lead (a signup is a customer,
    // not a prospect — injecting it into an outreach pipeline would corrupt the
    // "who have we contacted" record), surface them as their own list.
    //
    // A company counts as self-serve when no lead points at it via
    // leads.company_id AND no lead's company_name matches its name.
    if (action === 'get_selfserve_signups') {
      const [companiesRes, leadsRes] = await Promise.all([
        adminClient
          .from('companies')
          .select('id, name, slug, created_at, trial_ends_at')
          .order('created_at', { ascending: false }),
        adminClient.from('leads').select('id, company_id, company_name, stage'),
      ]);
      if (companiesRes.error) throw companiesRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const leads = (leadsRes.data ?? []) as {
        id: string; company_id: string | null; company_name: string; stage: string;
      }[];
      const linkedIds = new Set(leads.map(l => l.company_id).filter(Boolean));
      const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
      const leadsByName = new Map(leads.map(l => [norm(l.company_name), l]));

      const unlinked = ((companiesRes.data ?? []) as Record<string, unknown>[])
        .filter(c => !linkedIds.has(c.id as string))
        .map(c => {
          // A name match is a strong hint that sales DID work this company and
          // just never linked the row — surface it as a suggestion rather than
          // linking automatically, because names collide.
          const suggestion = leadsByName.get(norm(String(c.name ?? '')));
          return {
            ...c,
            suggested_lead_id: suggestion?.id ?? null,
            suggested_lead_stage: suggestion?.stage ?? null,
          };
        });

      return respond({ companies: unlinked, lead_count: leads.length });
    }

    // ── link_company_to_lead ───────────────────────────────────────────────────
    // Attach a signed-up company to the lead that was worked to win it, so the
    // pipeline reflects reality. Pass stage to close the lead out at the same
    // time (typically WON).
    if (action === 'link_company_to_lead') {
      const lead_id = payload?.lead_id as string | undefined;
      const company_id = payload?.company_id as string | undefined;
      const stage = payload?.stage as string | undefined;
      if (!lead_id || !company_id) {
        return respond({ error: 'payload.lead_id and payload.company_id are required' }, 400);
      }
      const VALID_STAGES = ['NEW', 'CONTACTED', 'DEMO_BOOKED', 'PILOT', 'WON', 'LOST', 'PARKED'];
      if (stage && !VALID_STAGES.includes(stage)) {
        return respond({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` }, 400);
      }

      const update: Record<string, unknown> = { company_id };
      if (stage) update.stage = stage;

      const { data, error } = await adminClient
        .from('leads')
        .update(update)
        .eq('id', lead_id)
        .select('*')
        .single();
      if (error) return respond({ error: error.message }, 400);
      return respond({ lead: data });
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

    // ── get_plan_catalog ───────────────────────────────────────────────────────
    // Everything the Plans tab needs in one round trip: every plan (including
    // inactive/non-public ones the anon pricing-page policy hides), its feature
    // rows, its Razorpay mapping, and how many subscriptions sit on it.
    if (action === 'get_plan_catalog') {
      const [plansRes, featuresRes, mappingRes, subsRes] = await Promise.all([
        adminClient.from('plans').select('*').order('monthly_price_inr', { ascending: true, nullsFirst: false }),
        adminClient.from('plan_features').select('*'),
        adminClient.from('plan_provider_mapping').select('*'),
        adminClient.from('subscriptions').select('plan_id, status'),
      ]);
      if (plansRes.error) throw plansRes.error;
      if (featuresRes.error) throw featuresRes.error;
      if (mappingRes.error) throw mappingRes.error;
      if (subsRes.error) throw subsRes.error;

      const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
      const providerMode = keyId ? razorpayKeyMode(keyId) : null;

      const featuresByPlan = new Map<string, Record<string, unknown>[]>();
      for (const f of featuresRes.data ?? []) {
        const list = featuresByPlan.get(f.plan_id) ?? [];
        list.push(f);
        featuresByPlan.set(f.plan_id, list);
      }
      const mappingByPlan = new Map<string, Record<string, unknown>>();
      for (const m of mappingRes.data ?? []) mappingByPlan.set(m.plan_id as string, m);

      const subCounts = new Map<string, { total: number; billable: number }>();
      for (const s of subsRes.data ?? []) {
        if (!s.plan_id) continue;
        const c = subCounts.get(s.plan_id) ?? { total: 0, billable: 0 };
        c.total += 1;
        if (s.status === 'active' || s.status === 'past_due') c.billable += 1;
        subCounts.set(s.plan_id, c);
      }

      const plans = (plansRes.data ?? []).map((p: Record<string, unknown>) => {
        const mapping = mappingByPlan.get(p.id as string) ?? null;
        return {
          ...p,
          features: featuresByPlan.get(p.id as string) ?? [],
          provider_mapping: mapping,
          subscription_count: subCounts.get(p.id as string)?.total ?? 0,
          billable_subscription_count: subCounts.get(p.id as string)?.billable ?? 0,
          // Drift flags are computed server-side so every client (and any
          // future one) sees the same definition of "advertised price !=
          // charged price". Compared as Numbers: NUMERIC comes back as a
          // string from PostgREST in some shapes.
          price_drift: mapping
            ? {
                monthly:
                  mapping.razorpay_plan_id_monthly != null &&
                  Number(mapping.monthly_price_inr_at_mapping) !== Number(p.monthly_price_inr),
                annual:
                  mapping.razorpay_plan_id_annual != null &&
                  Number(mapping.annual_price_inr_at_mapping) !== Number(p.annual_price_inr),
              }
            : { monthly: false, annual: false },
          // A mapping created against test-mode keys is unusable once the
          // live key is in place — checkout fails with "plan does not exist".
          mode_mismatch:
            !!mapping && !!providerMode && !!mapping.provider_mode && mapping.provider_mode !== providerMode,
        };
      });

      return respond({
        plans,
        feature_keys: PLAN_FEATURE_KEYS,
        provider_mode: providerMode,
        provider_configured: !!keyId,
      });
    }

    // ── create_plan ────────────────────────────────────────────────────────────
    if (action === 'create_plan') {
      const invalid = validatePlanInput(payload, { requireSlug: true });
      if (invalid) return respond({ error: invalid }, 400);
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';

      const { data, error } = await adminClient
        .from('plans')
        .insert({
          slug: (payload?.slug as string).trim(),
          name: (payload?.name as string).trim(),
          description: (payload?.description as string | null) ?? null,
          monthly_price_inr: numOrNull(payload?.monthly_price_inr),
          annual_price_inr: numOrNull(payload?.annual_price_inr),
          max_users: intOrNull(payload?.max_users),
          max_active_projects: intOrNull(payload?.max_active_projects),
          is_custom: payload?.is_custom === true,
          is_active: payload?.is_active !== false,
          is_public: payload?.is_public !== false,
        })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') return respond({ error: `A plan with slug "${payload?.slug}" already exists` }, 400);
        return respond({ error: error.message }, 400);
      }

      // Seed an explicit row per known feature key so the editor always has a
      // complete grid to toggle. All default to disabled — a new plan grants
      // nothing until the operator says so.
      const seed = PLAN_FEATURE_KEYS.map((feature_key) => ({ plan_id: data.id, feature_key, enabled: false }));
      const { error: featErr } = await adminClient.from('plan_features').insert(seed);
      if (featErr) return respond({ error: `Plan created but feature rows failed: ${featErr.message}` }, 500);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id: null, action: 'PLAN_CATALOG_CREATED', old_value: null, new_value: data,
      });

      return respond({ plan: data });
    }

    // ── update_plan ────────────────────────────────────────────────────────────
    // Note: `slug` is deliberately NOT updatable. get_company_entitlements
    // resolves its trial/expired fallbacks by slug ('trial', 'starter',
    // 'enterprise'), packages/shared types PlanSlug as a literal union, and
    // manage-subscription matches on it — renaming one from the panel would
    // break entitlement resolution with no error. Deactivate and create a new
    // plan instead.
    if (action === 'update_plan') {
      const plan_id = payload?.plan_id as string | undefined;
      if (!plan_id) return respond({ error: 'payload.plan_id is required' }, 400);
      const invalid = validatePlanInput(payload, { requireSlug: false });
      if (invalid) return respond({ error: invalid }, 400);
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';

      const { data: before, error: beforeErr } = await adminClient
        .from('plans').select('*').eq('id', plan_id).maybeSingle();
      if (beforeErr) return respond({ error: beforeErr.message }, 400);
      if (!before) return respond({ error: 'Unknown plan_id' }, 404);

      // get_company_entitlements resolves its no-subscription fallbacks by
      // slug ('trial' during an active trial, 'starter' once it expires,
      // 'enterprise' for grandfathered NULL-trial companies). Deactivating one
      // of those makes the SELECT that resolves it return no row, and every
      // affected company's entitlements collapse to '{}' — no features, no
      // caps, no error anywhere. Renaming and repricing them is fine.
      const ENTITLEMENT_FALLBACK_SLUGS = ['trial', 'starter', 'enterprise'];
      if (payload?.is_active === false && ENTITLEMENT_FALLBACK_SLUGS.includes(before.slug)) {
        return respond({
          error: `"${before.slug}" is an entitlement fallback plan and cannot be deactivated — companies without a subscription resolve to it. Hide it from the pricing page with is_public instead.`,
        }, 400);
      }

      const { data, error } = await adminClient
        .from('plans')
        .update({
          name: (payload?.name as string).trim(),
          description: (payload?.description as string | null) ?? null,
          monthly_price_inr: numOrNull(payload?.monthly_price_inr),
          annual_price_inr: numOrNull(payload?.annual_price_inr),
          max_users: intOrNull(payload?.max_users),
          max_active_projects: intOrNull(payload?.max_active_projects),
          is_custom: payload?.is_custom === true,
          is_active: payload?.is_active !== false,
          is_public: payload?.is_public !== false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan_id)
        .select('*')
        .single();
      if (error) return respond({ error: error.message }, 400);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id: null, action: 'PLAN_CATALOG_UPDATED', old_value: before, new_value: data,
      });

      // Report price drift back to the caller rather than leaving the operator
      // to notice it. Changing the advertised price does NOT change what
      // Razorpay charges — that needs a new provider plan (create_provider_plans).
      const { data: mapping } = await adminClient
        .from('plan_provider_mapping').select('*').eq('plan_id', plan_id).maybeSingle();
      const drift = mapping
        ? {
            monthly:
              mapping.razorpay_plan_id_monthly != null &&
              Number(mapping.monthly_price_inr_at_mapping) !== Number(data.monthly_price_inr),
            annual:
              mapping.razorpay_plan_id_annual != null &&
              Number(mapping.annual_price_inr_at_mapping) !== Number(data.annual_price_inr),
          }
        : { monthly: false, annual: false };

      return respond({
        plan: data,
        price_drift: drift,
        provider_warning:
          drift.monthly || drift.annual
            ? 'The advertised price no longer matches the mapped Razorpay plan. Razorpay plan amounts are immutable — create replacement Razorpay plans and remap, or new subscribers will be charged the old amount.'
            : null,
      });
    }

    // ── set_plan_feature ───────────────────────────────────────────────────────
    if (action === 'set_plan_feature') {
      const plan_id = payload?.plan_id as string | undefined;
      const feature_key = payload?.feature_key as string | undefined;
      const enabled = payload?.enabled;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!plan_id || !feature_key) return respond({ error: 'payload.plan_id and payload.feature_key are required' }, 400);
      if (typeof enabled !== 'boolean') return respond({ error: 'payload.enabled must be a boolean' }, 400);
      // Reject unknown keys: an entitlement key the app never reads is a
      // silent no-op that looks like a granted feature in the panel.
      if (!(PLAN_FEATURE_KEYS as readonly string[]).includes(feature_key)) {
        return respond({ error: `Unknown feature_key "${feature_key}". Add it to packages/shared/src/billing.ts and _shared/feature_keys.ts first.` }, 400);
      }

      const { data: before } = await adminClient
        .from('plan_features').select('*').eq('plan_id', plan_id).eq('feature_key', feature_key).maybeSingle();

      const { data, error } = await adminClient
        .from('plan_features')
        .upsert({ plan_id, feature_key, enabled }, { onConflict: 'plan_id,feature_key' })
        .select('*')
        .single();
      if (error) return respond({ error: error.message }, 400);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id: null, action: 'PLAN_FEATURE_UPDATED',
        old_value: before ?? null, new_value: data, metadata: { plan_id, feature_key },
      });

      return respond({ feature: data });
    }

    // ── set_plan_provider_mapping ──────────────────────────────────────────────
    // Manual entry path: an operator pastes Razorpay plan ids created outside
    // the panel (e.g. the live-mode ids at cutover). The prices recorded
    // alongside are the plan's CURRENT prices — which is only correct if the
    // pasted plans were genuinely created at those amounts, so the UI asks the
    // operator to confirm that.
    if (action === 'set_plan_provider_mapping') {
      const plan_id = payload?.plan_id as string | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!plan_id) return respond({ error: 'payload.plan_id is required' }, 400);

      const monthlyId = strOrNull(payload?.razorpay_plan_id_monthly);
      const annualId = strOrNull(payload?.razorpay_plan_id_annual);
      const mode = payload?.provider_mode as string | undefined;
      if (mode && mode !== 'test' && mode !== 'live') {
        return respond({ error: "payload.provider_mode must be 'test' or 'live'" }, 400);
      }

      const { data: plan, error: planErr } = await adminClient
        .from('plans').select('*').eq('id', plan_id).maybeSingle();
      if (planErr) return respond({ error: planErr.message }, 400);
      if (!plan) return respond({ error: 'Unknown plan_id' }, 404);

      const { data: before } = await adminClient
        .from('plan_provider_mapping').select('*').eq('plan_id', plan_id).maybeSingle();

      const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
      const { data, error } = await adminClient
        .from('plan_provider_mapping')
        .upsert({
          plan_id,
          razorpay_plan_id_monthly: monthlyId,
          razorpay_plan_id_annual: annualId,
          monthly_price_inr_at_mapping: monthlyId ? plan.monthly_price_inr : null,
          annual_price_inr_at_mapping: annualId ? plan.annual_price_inr : null,
          provider_mode: mode ?? (keyId ? razorpayKeyMode(keyId) : null),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'plan_id' })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') return respond({ error: 'That Razorpay plan id is already mapped to a different plan' }, 400);
        return respond({ error: error.message }, 400);
      }

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id: null, action: 'PLAN_PROVIDER_MAPPING_UPDATED',
        old_value: before ?? null, new_value: data, metadata: { source: 'manual' },
      });

      return respond({ provider_mapping: data });
    }

    // ── create_provider_plans ──────────────────────────────────────────────────
    // The whole reason a price change needed a migration: Razorpay plan
    // amounts are immutable, so a new price needs a NEW Razorpay plan. This
    // creates one (per requested interval) at the plan's current price and
    // remaps. Irreversible at the provider — Razorpay plans cannot be deleted,
    // the old ones are simply orphaned. In-flight subscriptions stay on their
    // original plan id and keep being charged the old amount; only new
    // checkouts pick this up.
    if (action === 'create_provider_plans') {
      const plan_id = payload?.plan_id as string | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      const intervals = Array.isArray(payload?.intervals)
        ? (payload?.intervals as string[])
        : ['monthly', 'annual'];
      if (!plan_id) return respond({ error: 'payload.plan_id is required' }, 400);
      if (intervals.some((i) => i !== 'monthly' && i !== 'annual')) {
        return respond({ error: "payload.intervals may only contain 'monthly' and 'annual'" }, 400);
      }

      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!keyId || !keySecret) {
        return respond({ error: 'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured for this project' }, 501);
      }

      const { data: plan, error: planErr } = await adminClient
        .from('plans').select('*').eq('id', plan_id).maybeSingle();
      if (planErr) return respond({ error: planErr.message }, 400);
      if (!plan) return respond({ error: 'Unknown plan_id' }, 404);
      if (plan.is_custom) {
        return respond({ error: 'Custom plans are sales-assisted and have no self-serve Razorpay plan' }, 400);
      }

      const provider = new RazorpayBillingProvider(keyId, keySecret);
      const { data: before } = await adminClient
        .from('plan_provider_mapping').select('*').eq('plan_id', plan_id).maybeSingle();

      const created: Record<string, string> = {};
      for (const interval of intervals) {
        const amount = interval === 'monthly' ? plan.monthly_price_inr : plan.annual_price_inr;
        if (amount == null) {
          return respond({ error: `Plan has no ${interval} price set — set one before creating a Razorpay plan` }, 400);
        }
        try {
          const { providerPlanId } = await provider.createPlan({
            name: `${plan.name} (${interval})`,
            interval: interval as 'monthly' | 'annual',
            amountInr: Number(amount),
            planSlug: plan.slug,
          });
          created[interval] = providerPlanId;
        } catch (err) {
          // Partial success is possible (monthly created, annual failed). Do
          // NOT throw away the id that succeeded — persist what we have so the
          // operator isn't left with an orphaned plan they can't see.
          const message = err instanceof Error ? err.message : String(err);
          if (Object.keys(created).length > 0) {
            await persistMapping(adminClient, plan, before, created, keyId, actor, 'partial');
          }
          return respond({
            error: `Razorpay plan creation failed for ${interval}: ${message}`,
            created_before_failure: created,
          }, 502);
        }
      }

      const mapping = await persistMapping(adminClient, plan, before, created, keyId, actor, 'created');
      return respond({ provider_mapping: mapping, created });
    }

    // ── get_company_feature_flags ──────────────────────────────────────────────
    // companies.features is a SEPARATE namespace from plan_features: per-tenant
    // operational kill switches read by frontend/src/lib/features.ts and the
    // has_feature() SQL function, not billing entitlements. Absent key =
    // enabled, so the panel shows tri-state (default / on / off).
    if (action === 'get_company_feature_flags') {
      const company_id = payload?.company_id as string | undefined;
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);
      const { data, error } = await adminClient
        .from('companies').select('id, name, features').eq('id', company_id).maybeSingle();
      if (error) return respond({ error: error.message }, 400);
      if (!data) return respond({ error: 'Unknown company_id' }, 404);
      return respond({ features: data.features ?? {}, flag_keys: COMPANY_FEATURE_FLAGS });
    }

    // ── set_company_feature_flags ──────────────────────────────────────────────
    if (action === 'set_company_feature_flags') {
      const company_id = payload?.company_id as string | undefined;
      const features = payload?.features as Record<string, unknown> | undefined;
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);
      if (!features || typeof features !== 'object' || Array.isArray(features)) {
        return respond({ error: 'payload.features must be an object' }, 400);
      }
      for (const [key, value] of Object.entries(features)) {
        if (!(COMPANY_FEATURE_FLAGS as readonly string[]).includes(key)) {
          return respond({ error: `Unknown company feature flag "${key}"` }, 400);
        }
        if (typeof value !== 'boolean') {
          return respond({ error: `Flag "${key}" must be true or false (omit the key entirely for the default)` }, 400);
        }
      }

      const { data: before } = await adminClient
        .from('companies').select('features').eq('id', company_id).maybeSingle();

      const { data, error } = await adminClient
        .from('companies')
        .update({ features })
        .eq('id', company_id)
        .select('id, features')
        .single();
      if (error) return respond({ error: error.message }, 400);

      await adminClient.from('billing_audit_logs').insert({
        actor, company_id, action: 'COMPANY_FEATURE_FLAGS_UPDATED',
        old_value: before?.features ?? null, new_value: data.features,
      });

      return respond({ features: data.features ?? {} });
    }

    // ── get_email_templates ────────────────────────────────────────────────────
    if (action === 'get_email_templates') {
      return respond({
        templates: EMAIL_TEMPLATE_KEYS.map((key) => ({
          key,
          label: EMAIL_TEMPLATES[key].label,
          requires_subject: EMAIL_TEMPLATES[key].requiresSubject,
          requires_message: EMAIL_TEMPLATES[key].requiresMessage,
        })),
        sender_configured: !!Deno.env.get('RESEND_API_KEY'),
        from: resendFrom(),
      });
    }

    // ── send_company_email ─────────────────────────────────────────────────────
    // Operator-initiated mail to a member of a tenant. Deliberately addressed
    // by profile id, never by a free-typed address: the platform token bypasses
    // RLS, and an action that mails arbitrary addresses turns a leaked token
    // into an open relay sending from our verified domain. The recipient must
    // be a profile in the named company.
    if (action === 'send_company_email') {
      const company_id = payload?.company_id as string | undefined;
      const to_user_id = payload?.to_user_id as string | undefined;
      const template = payload?.template ?? 'custom';
      const actor = (payload?.actor as string | undefined) ?? 'platform-admin';
      const message = strOrNull(payload?.message);
      const subjectInput = strOrNull(payload?.subject);

      if (!company_id || !to_user_id) {
        return respond({ error: 'payload.company_id and payload.to_user_id are required' }, 400);
      }
      if (!isTemplateKey(template)) {
        return respond({ error: `Unknown template "${String(template)}"` }, 400);
      }

      // Its own bucket on top of the function-wide 300/hr: sending is the one
      // action here with an external, reputation-bearing side effect.
      const sendLimit = await enforceRateLimit(adminClient, req, {
        key: 'platform-admin-send-email',
        limit: 60,
        windowMinutes: 60,
      }, corsHeaders);
      if (!sendLimit.ok) return sendLimit.response;

      const spec = EMAIL_TEMPLATES[template];
      if (spec.requiresSubject && !subjectInput) {
        return respond({ error: 'payload.subject is required for a custom message' }, 400);
      }
      if (spec.requiresMessage && !message) {
        return respond({ error: 'payload.message is required for a custom message' }, 400);
      }
      if (subjectInput && subjectInput.length > 200) {
        return respond({ error: 'payload.subject must be 200 characters or fewer' }, 400);
      }
      if (message && message.length > 5000) {
        return respond({ error: 'payload.message must be 5000 characters or fewer' }, 400);
      }

      const { data: company, error: companyErr } = await adminClient
        .from('companies').select('id, name, slug, trial_ends_at').eq('id', company_id).maybeSingle();
      if (companyErr) return respond({ error: companyErr.message }, 400);
      if (!company) return respond({ error: 'Unknown company_id' }, 404);

      const { data: recipient, error: recipientErr } = await adminClient
        .from('profiles').select('id, name, email, company_id').eq('id', to_user_id).maybeSingle();
      if (recipientErr) return respond({ error: recipientErr.message }, 400);
      if (!recipient) return respond({ error: 'Unknown to_user_id' }, 404);
      if (recipient.company_id !== company_id) {
        return respond({ error: 'That user does not belong to this company' }, 400);
      }
      if (!recipient.email) return respond({ error: 'That user has no email address on file' }, 400);

      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) return respond({ error: 'RESEND_API_KEY is not configured for this project' }, 501);

      const daysRemaining = company.trial_ends_at
        ? Math.ceil((new Date(company.trial_ends_at).getTime() - Date.now()) / 86_400_000)
        : undefined;

      const rendered = spec.render({
        companyName: company.name,
        companySlug: company.slug,
        recipientName: recipient.name ?? '',
        message: message ?? undefined,
        daysRemaining,
      }, subjectInput ?? '');

      // Reply-To is only set when RESEND_REPLY_TO names a mailbox that can
      // actually receive — pointing replies at an address with no inbox is
      // worse than having no Reply-To at all.
      const replyTo = Deno.env.get('RESEND_REPLY_TO')?.trim();

      let resendMessageId: string | null = null;
      let status: 'sent' | 'failed' = 'sent';
      let errorText: string | null = null;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: resendFrom(),
            to: [recipient.email],
            subject: rendered.subject,
            html: rendered.html,
            ...(replyTo ? { reply_to: replyTo } : {}),
          }),
        });
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          resendMessageId = (body as { id?: string }).id ?? null;
        } else {
          status = 'failed';
          errorText = await res.text();
        }
      } catch (err) {
        status = 'failed';
        errorText = err instanceof Error ? err.message : String(err);
      }

      // Log both outcomes. A failed send is exactly the thing an operator needs
      // to see later — silently dropping it is how "we definitely emailed them"
      // becomes unanswerable.
      const { data: logRow, error: logErr } = await adminClient
        .from('email_log')
        .insert({
          company_id,
          to_user_id: recipient.id,
          to_email: recipient.email,
          subject: rendered.subject,
          template,
          body_html: rendered.html,
          status,
          resend_message_id: resendMessageId,
          error: errorText,
          actor,
        })
        .select('*')
        .single();
      if (logErr) logEdgeError('platform-admin-data', 'db_error', logErr, { action });

      if (status === 'failed') {
        return respond({ error: `Resend rejected the message: ${errorText}` }, 502);
      }
      return respond({ email: logRow ?? null, resend_message_id: resendMessageId });
    }

    // ── get_company_emails ─────────────────────────────────────────────────────
    // Two-way thread for one company: what we sent (email_log) and what came
    // back in (inbound_emails, populated by the resend-inbound webhook).
    if (action === 'get_company_emails') {
      const company_id = payload?.company_id as string | undefined;
      if (!company_id) return respond({ error: 'payload.company_id is required' }, 400);

      const [sentRes, receivedRes] = await Promise.all([
        adminClient
          .from('email_log')
          .select('id, to_email, subject, template, status, resend_message_id, error, actor, sent_at')
          .eq('company_id', company_id)
          .order('sent_at', { ascending: false })
          .limit(50),
        adminClient
          .from('inbound_emails')
          .select('id, from_email, from_name, subject, text_body, received_at, handled')
          .eq('company_id', company_id)
          .order('received_at', { ascending: false })
          .limit(50),
      ]);
      if (sentRes.error) throw sentRes.error;
      // inbound_emails may not exist yet on an environment that hasn't run the
      // migration — degrade to "no inbound" rather than failing the whole view.
      const received = receivedRes.error?.code === '42P01' ? [] : (receivedRes.data ?? []);
      if (receivedRes.error && receivedRes.error.code !== '42P01') throw receivedRes.error;

      return respond({ sent: sentRes.data ?? [], received });
    }

    // ── get_unassigned_inbound ─────────────────────────────────────────────────
    // Inbound mail whose sender matched no profile — support@ reached by a
    // prospect, a vendor, or Razorpay's reviewers. Without this view those
    // messages land in a table nobody looks at.
    if (action === 'get_unassigned_inbound') {
      const { data, error } = await adminClient
        .from('inbound_emails')
        .select('id, from_email, from_name, to_email, subject, text_body, received_at, handled')
        .is('company_id', null)
        .order('received_at', { ascending: false })
        .limit(100);
      if (error) {
        if (error.code === '42P01') return respond({ emails: [] });
        throw error;
      }
      return respond({ emails: data ?? [] });
    }

    // ── mark_inbound_handled ───────────────────────────────────────────────────
    if (action === 'mark_inbound_handled') {
      const inbound_id = payload?.inbound_id as string | undefined;
      const handled = payload?.handled;
      if (!inbound_id) return respond({ error: 'payload.inbound_id is required' }, 400);
      if (typeof handled !== 'boolean') return respond({ error: 'payload.handled must be a boolean' }, 400);

      const { data, error } = await adminClient
        .from('inbound_emails')
        .update({ handled })
        .eq('id', inbound_id)
        .select('id, handled')
        .single();
      if (error) return respond({ error: error.message }, 400);
      return respond({ email: data });
    }

    // ── get_mail_inbox ─────────────────────────────────────────────────────────
    // Every inbound message across every company, plus the ones that matched no
    // profile at all (company_id NULL — prospects, vendors, Razorpay's
    // reviewers). The per-company view in the Companies tab can't show those,
    // which is why this exists as its own top-level surface.
    if (action === 'get_mail_inbox') {
      const onlyUnhandled = payload?.only_unhandled === true;
      let query = adminClient
        .from('inbound_emails')
        .select('id, company_id, from_email, from_name, to_email, subject, text_body, received_at, handled, companies:company_id(name, slug)')
        .order('received_at', { ascending: false })
        .limit(200);
      if (onlyUnhandled) query = query.eq('handled', false);

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01') return respond({ emails: [], unhandled_count: 0 });
        throw error;
      }

      const { count } = await adminClient
        .from('inbound_emails')
        .select('*', { count: 'exact', head: true })
        .eq('handled', false);

      return respond({ emails: data ?? [], unhandled_count: count ?? 0 });
    }

    // ── get_mail_sent ──────────────────────────────────────────────────────────
    if (action === 'get_mail_sent') {
      const { data, error } = await adminClient
        .from('email_log')
        .select('id, company_id, to_email, subject, template, status, resend_message_id, error, actor, sent_at, companies:company_id(name, slug)')
        .order('sent_at', { ascending: false })
        .limit(200);
      if (error) {
        if (error.code === '42P01') return respond({ emails: [] });
        throw error;
      }
      return respond({ emails: data ?? [] });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('platform-admin-data', 'api_error', err, { action });
    return respond({ error: message }, 500);
  }
});
