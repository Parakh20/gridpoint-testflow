import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * supabase-js throws FunctionsHttpError for any non-2xx response from
 * `supabase.functions.invoke(...)` — `data` is null and the structured JSON
 * body (e.g. `{ code: 'PLAN_LIMIT_REACHED', current, limit, required_plan }`
 * from create-user's 403, or `{ scheduled: false, blockers }` from
 * manage-subscription's 409) lives on `error.context`, a Response object,
 * not on `error` itself. Reading `error.message` alone only ever yields
 * "Edge Function returned a non-2xx status code".
 */
export async function parseFunctionsErrorBody(error: unknown): Promise<Record<string, unknown> | null> {
  if (error instanceof FunctionsHttpError) {
    try {
      return await error.context.json();
    } catch {
      return null;
    }
  }
  return null;
}
