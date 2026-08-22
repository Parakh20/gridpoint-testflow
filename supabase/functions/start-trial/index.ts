// Public, self-serve trial signup — the front half of the funnel that
// create-tenant (platform-token gated, used by sales/ops) doesn't cover.
// Creates company + SUPERADMIN user atomically, same rollback discipline as
// create-tenant, but:
//   - no X-Platform-Token: this endpoint is intentionally public
//   - slug is derived from the company name server-side (collision-checked)
//     instead of user-supplied, to avoid a slug-availability UX round-trip
//   - tight per-IP rate limit (unauthenticated + no CAPTCHA v1 — this is
//     the primary abuse control until one is added)
// New company gets the default 'trial' plan tier + trial_ends_at via the
// existing companies-table trigger (NOW() + 14 days) — nothing here sets
// those explicitly.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/rate_limit.ts';
import { logEdgeError } from '../_shared/monitoring.ts';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 5 signups per IP per hour — public unauthenticated endpoint, this is
    // the primary abuse guard until a CAPTCHA is added.
    const rl = await enforceRateLimit(adminClient, req, {
      key: 'start-trial',
      limit: 5,
      windowMinutes: 60,
    }, cors);
    if (!rl.ok) return rl.response;

    const { company_name, email, password, full_name } = await req.json();

    if (!company_name || !email || !password || !full_name) {
      return json({ error: 'company_name, email, password, and full_name are required' }, 400);
    }
    if (typeof password !== 'string' || password.length < 10) {
      return json({ error: 'Password must be at least 10 characters' }, 400);
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!(hasUpper && hasLower && hasDigit)) {
      return json({ error: 'Password must include uppercase, lowercase, and a number' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email address' }, 400);
    }

    // Derive a unique slug from the company name: base-slug, base-slug-2,
    // base-slug-3, ... first free one wins. Bounded attempts so a pathological
    // collision run can't loop forever.
    const baseSlug = slugify(String(company_name));
    let slug = baseSlug;
    let suffix = 1;
    for (let attempts = 0; attempts < 50; attempts++) {
      const { data: existing } = await adminClient
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!existing) break;
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({ name: String(company_name).trim(), slug })
      .select('id')
      .single();

    if (companyError || !company) {
      logEdgeError('start-trial', 'db_error', companyError);
      return json({ error: 'Failed to create company' }, 500);
    }

    const company_id = company.id;

    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (createError || !newUserData?.user) {
      await adminClient.from('companies').delete().eq('id', company_id);
      const msg = createError?.message ?? 'Unknown error';
      const code = msg.toLowerCase().includes('already') ? 'email_taken' : 'create_user_failed';
      return json({ error: code, message: msg }, 400);
    }

    const user_id = newUserData.user.id;

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ company_id, name: full_name.trim() })
      .eq('id', user_id);

    if (profileError) {
      await adminClient.auth.admin.deleteUser(user_id);
      await adminClient.from('companies').delete().eq('id', company_id);
      logEdgeError('start-trial', 'db_error', profileError);
      return json({ error: 'Failed to finish account setup' }, 500);
    }

    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({ user_id, role: 'SUPERADMIN', company_id });

    if (roleError) {
      await adminClient.auth.admin.deleteUser(user_id);
      await adminClient.from('companies').delete().eq('id', company_id);
      logEdgeError('start-trial', 'db_error', roleError);
      return json({ error: 'Failed to finish account setup' }, 500);
    }

    return json({ company_slug: slug, workspace_url: `https://${slug}.optimustesting.com` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('start-trial', 'auth_failure', err);
    return json({ error: message }, 500);
  }
});
