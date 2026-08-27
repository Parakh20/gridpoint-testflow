import { supabase } from '@/integrations/supabase/client';
import { getPlatformToken } from './platformToken';

// ─── Secure platform data fetcher ────────────────────────────────────────────
// Calls the platform-admin-data Edge Function (service role, RLS-bypass) with
// the platform token. Shared by PlatformDashboard and the Sales section.
// The token comes from the session (entered at platform login), never from a
// build-time env var — see platformToken.ts.
export const platformFetch = async (action: string, payload?: object) => {
  const token = getPlatformToken();
  if (!token) throw new Error('Platform session expired — sign in again');
  const { data, error } = await supabase.functions.invoke('platform-admin-data', {
    body: { action, payload },
    headers: { 'X-Platform-Token': token },
  });
  // Non-2xx: supabase-js reports only "Edge Function returned a non-2xx status
  // code" and hides the body, which is where the actual reason lives. The
  // Response is on error.context, so read it and rethrow with the real message —
  // debugging a send failure from the generic string alone is guesswork.
  if (error) {
    const response = (error as { context?: Response }).context;
    if (response && typeof response.json === 'function') {
      try {
        const body = await response.clone().json();
        if (body?.error) throw new Error(String(body.error));
      } catch (parseErr) {
        // A rethrown Error above is the real error; anything else means the body
        // wasn't JSON, in which case the SDK error is the best we have.
        if (parseErr instanceof Error && parseErr.message && !(parseErr instanceof SyntaxError)) {
          throw parseErr;
        }
      }
    }
    throw error;
  }
  // 200 with an error field: the function returned a structured error — surface it.
  if (data?.error) throw new Error(data.error);
  return data;
};
