import { supabase } from '@/integrations/supabase/client';

// ─── Secure platform data fetcher ────────────────────────────────────────────
// Calls the platform-admin-data Edge Function (service role, RLS-bypass) with
// the platform token. Shared by PlatformDashboard and the Sales section.
export const platformFetch = async (action: string, payload?: object) => {
  const token = import.meta.env.VITE_PLATFORM_ADMIN_TOKEN;
  if (!token) throw new Error('VITE_PLATFORM_ADMIN_TOKEN is not configured');
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
