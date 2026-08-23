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
import { resendFrom } from '../_shared/email.ts';

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

    // 20 signups per IP per hour — public unauthenticated endpoint, this is
    // the primary abuse guard until a CAPTCHA is added. Deliberately not
    // tighter: this key buckets by IP alone, and real prospects routinely
    // share an egress IP (corporate NAT, CGNAT, VPN, the Cloudflare edge in
    // front of this project), so a low limit makes one signup lock out
    // everyone behind the same address. 20 still bounds junk-tenant creation
    // to a rate a human can't exceed legitimately.
    const rl = await enforceRateLimit(adminClient, req, {
      key: 'start-trial',
      limit: 20,
      windowMinutes: 60,
    }, cors);
    if (!rl.ok) return rl.response;

    const {
      company_name, email, password, full_name,
      phone, company_size, industry, country,
    } = await req.json();

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

    const optionalText = (value: unknown, max: number): string | null => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed ? trimmed.slice(0, max) : null;
    };

    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({
        name: String(company_name).trim(),
        slug,
        phone: optionalText(phone, 40),
        company_size: optionalText(company_size, 40),
        industry: optionalText(industry, 80),
        country: optionalText(country, 80),
      })
      .select('id')
      .single();

    if (companyError || !company) {
      logEdgeError('start-trial', 'db_error', companyError);
      return json({ error: 'Failed to create company' }, 500);
    }

    const company_id = company.id;

    // email_confirm: false — the address is unverified at this point, so the
    // account stays unconfirmed until the user clicks the link mailed below.
    // Supabase blocks sign-in for an unconfirmed user, which is the actual
    // gate; nothing else here needs to check it.
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: false,
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

    // Mail the confirmation link ourselves via Resend rather than relying on
    // Supabase's built-in mailer, which is rate-limited to a handful of
    // messages an hour on this project and would silently throttle real
    // signups. Same generateLink + redirect_to rewrite pattern the platform
    // admin magic-link flow uses (Supabase ignores options.redirectTo in
    // generateLink, so the query param has to be set on the returned URL).
    const workspaceUrl = "https://app.optimustesting.com";
    let emailSent = false;

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email: email.trim(),
      password,
      options: { redirectTo: `${workspaceUrl}/auth` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      logEdgeError('start-trial', 'auth_failure', linkError ?? new Error('generateLink returned no action_link'));
    } else {
      const confirmUrl = new URL(linkData.properties.action_link);
      confirmUrl.searchParams.set('redirect_to', `${workspaceUrl}/auth`);

      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) {
        logEdgeError('start-trial', 'api_error', new Error('RESEND_API_KEY not configured — confirmation email not sent'));
      } else {
        const escape = (value: string) =>
          value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: resendFrom(),
            to: [email.trim()],
            subject: 'Confirm your TestFlow workspace',
            html: `
              <p>Hi ${escape(full_name.trim())},</p>
              <p>Your TestFlow workspace <strong>${escape(String(company_name).trim())}</strong> is ready — confirm your email to activate it.</p>
              <p><a href="${confirmUrl.toString()}">Confirm my email</a></p>
              <p>Once confirmed you can sign in at <a href="${workspaceUrl}/auth">${workspaceUrl}</a>.</p>
              <p>This link expires in 24 hours.</p>
            `,
          }),
        });
        if (resendRes.ok) {
          emailSent = true;
        } else {
          logEdgeError('start-trial', 'api_error', await resendRes.text());
        }
      }
    }

    // The workspace exists either way — a mail failure must not roll back a
    // successfully created tenant, but the client needs to know so it can
    // tell the user to contact support rather than watch for an email that
    // will never arrive.
    return json({ company_slug: slug, workspace_url: workspaceUrl, email_sent: emailSent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('start-trial', 'auth_failure', err);
    return json({ error: message }, 500);
  }
});
