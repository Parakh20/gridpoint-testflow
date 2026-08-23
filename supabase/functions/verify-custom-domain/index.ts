// Custom-domain verification and provisioning.
//
// Two entry points, both landing on the same logic:
//   X-Cron-Secret            sweep every unprovisioned domain (GH Actions cron)
//   Authorization: Bearer    a SUPERADMIN checking their OWN company's domain
//                            from Settings > Workspace ("Check now")
//
// Verification proves DNS control by reading the TXT record the tenant was
// told to publish. That check is done here rather than in the database
// because Postgres can't make outbound DNS queries, and it must not be done
// in the browser — a client could simply claim success. The RPCs that flip
// verified_at/provisioned_at are service-role only for the same reason.
//
// Provisioning (registering the hostname with Vercel so TLS is issued) runs
// only when VERCEL_API_TOKEN is configured. Without it the domain still
// verifies and sits in "awaiting activation" for an operator to finish with
// `vercel domains add <domain> <project>` — deliberately not a hard failure,
// since a Vercel token is account-wide and an operator may not want one
// sitting in Supabase secrets.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { logEdgeError } from '../_shared/monitoring.ts';

function tokensMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

interface DohAnswer { type: number; data: string }

/**
 * TXT values for a name. Cloudflare first, Google as a fallback — a single
 * resolver being unreachable shouldn't look like "the record isn't there",
 * which would strand a tenant who had published it correctly.
 */
async function lookupTxt(name: string): Promise<string[] | null> {
  const endpoints = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/dns-json' } });
      if (!res.ok) continue;
      const body = await res.json() as { Status: number; Answer?: DohAnswer[] };
      // NXDOMAIN/NOERROR are both real answers; only a transport failure
      // should fall through to the next resolver.
      if (body.Status !== 0 && body.Status !== 3) continue;
      return (body.Answer ?? [])
        .filter(a => a.type === 16)
        // DoH returns TXT data quoted, and long values arrive split into
        // several quoted chunks that must be concatenated.
        .map(a => a.data.replace(/"\s*"/g, '').replace(/^"|"$/g, ''));
    } catch {
      continue;
    }
  }
  return null; // every resolver failed — inconclusive, not "not found"
}

async function provisionWithVercel(domain: string): Promise<{ ok: boolean; detail: string }> {
  const token = Deno.env.get('VERCEL_API_TOKEN');
  const projectId = Deno.env.get('VERCEL_PROJECT_ID');
  if (!token || !projectId) {
    return { ok: false, detail: 'vercel_not_configured' };
  }
  const teamId = Deno.env.get('VERCEL_TEAM_ID');
  const url = `https://api.vercel.com/v10/projects/${projectId}/domains` +
    (teamId ? `?teamId=${encodeURIComponent(teamId)}` : '');

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: domain }),
  });

  if (res.ok) return { ok: true, detail: 'added' };

  const body = await res.text();
  // Already attached to this project is the desired end state, not an error —
  // re-running the sweep must be idempotent.
  if (res.status === 409 || body.includes('domain_already_in_use')) {
    return { ok: true, detail: 'already_present' };
  }
  return { ok: false, detail: `vercel_error_${res.status}: ${body.slice(0, 200)}` };
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Decide which domains this caller may act on ──────────────────────
    const cronSecret = Deno.env.get('RECONCILE_CRON_SECRET');
    const providedCron = req.headers.get('X-Cron-Secret') ?? '';
    const isCron = !!cronSecret && !!providedCron && tokensMatch(providedCron, cronSecret);

    let targets: { domain: string; verification_token: string; verified_at: string | null }[] = [];

    if (isCron) {
      const { data, error } = await admin.rpc('pending_custom_domains');
      if (error) {
        logEdgeError('verify-custom-domain', 'db_error', error);
        return json({ error: error.message }, 500);
      }
      targets = data ?? [];
    } else {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return json({ error: 'Unauthorized' }, 401);

      const caller = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: authError } = await caller.auth.getUser();
      if (authError || !user) return json({ error: 'Unauthorized' }, 401);

      // Only a SUPERADMIN may drive this, and only for their own company's
      // domain — checked server-side, since the route gate is client-side.
      const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
      if (!(roles ?? []).some(r => r.role === 'SUPERADMIN')) {
        return json({ error: 'Only a SUPERADMIN can verify a custom domain' }, 403);
      }

      const { data: profile } = await admin
        .from('profiles').select('company_id').eq('id', user.id).maybeSingle();
      if (!profile?.company_id) return json({ error: 'Caller has no company assigned' }, 400);

      const { data: own } = await admin
        .from('company_domains')
        .select('domain, verification_token, verified_at')
        .eq('company_id', profile.company_id)
        .maybeSingle();
      if (!own) return json({ error: 'No custom domain configured for this workspace' }, 404);
      targets = [own];
    }

    // ── Verify, then provision ───────────────────────────────────────────
    const results = [];
    for (const target of targets) {
      let verified = target.verified_at !== null;

      if (!verified) {
        const txt = await lookupTxt(`_testflow-verify.${target.domain}`);
        if (txt === null) {
          results.push({ domain: target.domain, verified: false, reason: 'dns_lookup_failed' });
          continue;
        }
        if (!txt.includes(target.verification_token)) {
          results.push({ domain: target.domain, verified: false, reason: 'txt_record_not_found' });
          continue;
        }
        const { error } = await admin.rpc('mark_custom_domain_verified', { _domain: target.domain });
        if (error) {
          logEdgeError('verify-custom-domain', 'db_error', error);
          results.push({ domain: target.domain, verified: false, reason: 'db_error' });
          continue;
        }
        verified = true;
      }

      const provision = await provisionWithVercel(target.domain);
      if (provision.ok) {
        const { error } = await admin.rpc('mark_custom_domain_provisioned', { _domain: target.domain });
        if (error) logEdgeError('verify-custom-domain', 'db_error', error);
      } else if (provision.detail !== 'vercel_not_configured') {
        logEdgeError('verify-custom-domain', 'api_error', new Error(provision.detail));
      }

      results.push({
        domain: target.domain,
        verified,
        provisioned: provision.ok,
        provision_detail: provision.detail,
      });
    }

    return json({ ok: true, checked: results.length, results });
  } catch (err) {
    logEdgeError('verify-custom-domain', 'db_error', err);
    return json({ error: (err as Error).message }, 500);
  }
});
