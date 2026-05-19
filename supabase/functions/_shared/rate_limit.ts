// Edge Function rate limiter — Postgres-backed sliding window.
// Use to protect public-ish or admin Edge Functions from abuse.
//
//   import { enforceRateLimit } from '../_shared/rate_limit.ts';
//   const rl = await enforceRateLimit(supabaseAdmin, req, {
//     key: `create-user:${callerUserId}`, limit: 20, windowMinutes: 60,
//   });
//   if (!rl.ok) return rl.response;
//
// The supabaseAdmin client must be the service-role client (rate_limit_check
// is SECURITY DEFINER but the RPC GRANT defaults to public — we pass through
// to be explicit).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMinutes: number;
}

interface RateLimitResult {
  ok: true;
}

interface RateLimitBlocked {
  ok: false;
  response: Response;
}

export async function enforceRateLimit(
  supabaseAdmin: SupabaseClient,
  req: Request,
  opts: RateLimitOptions,
  corsHeaders: Record<string, string>,
): Promise<RateLimitResult | RateLimitBlocked> {
  // Anonymize IP into the bucket so we get per-IP fairness even when caller
  // isn't authenticated. Trust X-Forwarded-For from Supabase ingress.
  const xff = req.headers.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0]?.trim() || 'unknown';
  const fullKey = `${opts.key}|ip:${ip}`;

  const { data, error } = await supabaseAdmin.rpc('rate_limit_check', {
    _key: fullKey,
    _limit: opts.limit,
    _window_minutes: opts.windowMinutes,
  });

  if (error) {
    // Fail open on rate-limit infrastructure errors — better than blocking
    // legitimate traffic when the rate-limit table is the problem.
    console.error('rate_limit_check error (failing open):', error.message);
    return { ok: true };
  }

  if (data === false) {
    const response = new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after_seconds: opts.windowMinutes * 60,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(opts.windowMinutes * 60),
        },
      },
    );
    return { ok: false, response };
  }

  return { ok: true };
}
