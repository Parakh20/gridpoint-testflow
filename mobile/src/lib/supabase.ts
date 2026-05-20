import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { secureStorage } from './secureStorage';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loud at module load — silent misconfiguration leads to confusing 401s later.
  // eslint-disable-next-line no-console
  console.error('[supabase] Missing supabaseUrl / supabaseAnonKey in app.json extra');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Equipment labels + status types now live in @testflow/shared so the web and
// mobile clients can't drift. Re-export here for backwards compatibility with
// any caller that still imports from this module.
export { EQUIPMENT_LABEL, labelForEquipment } from '@testflow/shared';
export type { ProjectStatus, TestStatus } from '@testflow/shared';
