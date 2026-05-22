import Constants from 'expo-constants';
import { supabase } from './supabase';

// Mirrors frontend/src/pages/PlatformAdmin/PlatformDashboard.tsx — all reads
// for the Platform Admin panel go through the platform-admin-data Edge
// Function (service role, gated by X-Platform-Token).
export async function platformFetch<T = any>(action: string, payload?: object): Promise<T> {
  const token = Constants.expoConfig?.extra?.platformAdminToken as string | undefined;
  if (!token) {
    throw new Error('platformAdminToken is not configured in app.json extra');
  }
  const { data, error } = await supabase.functions.invoke('platform-admin-data', {
    body: { action, payload },
    headers: { 'X-Platform-Token': token },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export function platformAdminPassword(): string {
  return (Constants.expoConfig?.extra?.platformAdminPassword as string | undefined) ?? '';
}

export function platformAdminTokenConfigured(): boolean {
  return Boolean(Constants.expoConfig?.extra?.platformAdminToken);
}
