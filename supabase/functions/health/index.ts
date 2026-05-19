// Health check endpoint for uptime monitoring.
// Public — no auth required. Returns 200 if the DB is reachable, 503 otherwise.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERSION = Deno.env.get('DEPLOY_COMMIT_SHA') ?? 'unknown';

Deno.serve(async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    // Public endpoint — wildcard CORS is fine here, no sensitive data
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Cheapest possible probe — counts a table we know exists
    const { error } = await supabase
      .from('companies')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, db: 'error', version: VERSION, error: error.message }),
        { status: 503, headers },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, db: 'reachable', version: VERSION, ts: new Date().toISOString() }),
      { status: 200, headers },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, db: 'unknown', version: VERSION, error: (e as Error).message }),
      { status: 503, headers },
    );
  }
});
