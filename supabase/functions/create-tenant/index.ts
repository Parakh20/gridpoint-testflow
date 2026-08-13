import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/rate_limit.ts';
import { logEdgeError } from '../_shared/monitoring.ts';

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
    // 1. Validate platform token
    const platformToken = req.headers.get('X-Platform-Token');
    const expectedToken = Deno.env.get('PLATFORM_ADMIN_TOKEN');
    if (!platformToken || !expectedToken || platformToken !== expectedToken) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // Rate limit: 20 tenant creations per IP per hour. Even with a valid
    // platform token, throttle in case the token is leaked.
    const supabaseAdminForRl = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const rl = await enforceRateLimit(supabaseAdminForRl, req, {
      key: 'create-tenant',
      limit: 20,
      windowMinutes: 60,
    }, cors);
    if (!rl.ok) return rl.response;

    // 2. Parse and validate inputs
    const { name, slug, email, password, full_name } = await req.json();

    if (!name || !slug || !email || !password || !full_name) {
      return json({ error: 'name, slug, email, password, and full_name are required' }, 400);
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
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
      return json({ error: 'Slug must be lowercase alphanumeric with hyphens only' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email address' }, 400);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 3. Check slug uniqueness
    const { data: existingCompany } = await adminClient
      .from('companies')
      .select('id')
      .eq('slug', slug.trim())
      .maybeSingle();

    if (existingCompany) {
      return json({ error: 'slug_taken', message: `Slug "${slug}" is already in use` }, 400);
    }

    // 4. Create company
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({ name: name.trim(), slug: slug.trim() })
      .select('id')
      .single();

    if (companyError || !company) {
      return json({ error: `Failed to create company: ${companyError?.message}` }, 500);
    }

    const company_id = company.id;

    // 5. Create auth user — rollback company on failure
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

    // 6. Set company_id and name on the auto-created profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ company_id, name: full_name.trim() })
      .eq('id', user_id);

    if (profileError) {
      await adminClient.auth.admin.deleteUser(user_id);
      await adminClient.from('companies').delete().eq('id', company_id);
      return json({ error: `Profile update failed: ${profileError.message}` }, 500);
    }

    // 7. Assign SUPERADMIN role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({ user_id, role: 'SUPERADMIN', company_id });

    if (roleError) {
      await adminClient.auth.admin.deleteUser(user_id);
      await adminClient.from('companies').delete().eq('id', company_id);
      return json({ error: `Role assignment failed: ${roleError.message}` }, 500);
    }

    const workspace_url = `https://${slug}.optimustesting.com`;

    return json({ company_id, company_slug: slug, user_id, workspace_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logEdgeError('create-tenant', 'auth_failure', err);
    return json({ error: message }, 500);
  }
});
