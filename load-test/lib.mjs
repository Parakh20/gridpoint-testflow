// Shared helpers for the load-test toolkit.
// Reads config from load-test/.env and refuses to run against production.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const PROD_REF = 'hxfilijpaocogsgjrjnq'; // production project ref — never load-test this

export const URL = process.env.SUPABASE_URL ?? '';
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

export function assertSafeTarget() {
  if (!URL || !SERVICE_KEY) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in load-test/.env');
  }
  if (URL.includes(PROD_REF) && process.env.ALLOW_PROD !== '1') {
    throw new Error(
      `Refusing to run against the production project (${PROD_REF}). ` +
      `Point SUPABASE_URL at a staging project, or set ALLOW_PROD=1 if you really mean it.`
    );
  }
  console.log(`▶ target: ${URL}`);
}

// Service-role client (bypasses RLS) — for seeding/admin only.
export function admin() {
  return createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Anon client (RLS applies) — for simulating a real signed-in user.
export function anon() {
  return createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const TEST_EMAIL_DOMAIN = 'loadtest.local';
export const TEST_PASSWORD = 'LoadTest123!'; // meets policy: 10+, upper+lower+digit
export const TEST_COMPANY_SLUG = 'loadtest-co';

export const EQUIPMENT_TYPES = ['POWER_TRANSFORMER', 'CT', 'CVT', 'LA', 'SF6_BREAKER', 'ISOLATOR', 'VCB', 'EARTH_PIT'];

export const num = (name, dflt) => Number(process.env[name] ?? dflt);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry transient network/rate-limit failures with exponential backoff.
export async function withRetry(fn, { tries = 5, base = 600, label = 'op' } = {}) {
  let last;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e?.message ?? String(e);
      const transient = /fetch failed|timeout|ECONN|ETIMEDOUT|UND_ERR|socket|network|429|rate limit/i.test(msg);
      if (!transient || attempt === tries - 1) throw e;
      await sleep(base * 2 ** attempt + Math.random() * 300);
    }
  }
  throw last;
}

// Run async tasks with bounded concurrency.
export async function pool(items, size, fn) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await fn(items[idx], idx);
      }
    })
  );
  return results;
}
