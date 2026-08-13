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
  // Non-2xx: the Supabase client swallows the body — throw the SDK error directly.
  if (error) throw error;
  // 200 with an error field: the function returned a structured error — surface it.
  if (data?.error) throw new Error(data.error);
  return data;
};
