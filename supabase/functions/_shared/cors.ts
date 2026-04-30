// Allowed origins for browser calls to Edge Functions.
// Add new client domains here as they come online.
const ALLOWED_ORIGINS = [
  'https://optimustesting.com',
  'https://www.optimustesting.com',
  'http://localhost:8080',
  'http://localhost:5173',
];

export function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || /\.optimustesting\.com$/.test(new URL(origin).hostname))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-platform-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// Backwards-compat export so existing imports keep working.
// Returns wildcard headers — callers should migrate to buildCorsHeaders(origin).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
