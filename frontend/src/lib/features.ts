/**
 * Per-tenant feature flags.
 *
 * Flags are stored on `companies.features` (JSONB). The backend can also
 * gate via the `has_feature(_flag)` SQL function. Defaults are open
 * (unspecified flag → enabled) so existing tenants don't suddenly lose features.
 *
 * To gate a flag at the SQL layer (RLS), check `has_feature('flag_name')`.
 * To gate it in the UI, use the `useFeature` hook below.
 */

import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

export type FeatureFlag =
  | 'ai_reports'           // generate-report Edge Function
  | 'bulk_invite'          // BulkInviteDialog
  | 'project_clone'        // clone_project RPC
  | 'audit_log_viewer';    // AuditLogViewer in superadmin

interface FeaturesRow {
  features: Record<string, boolean> | null;
}

/**
 * Returns TRUE if the caller's company has the flag enabled (default TRUE).
 * Loading state returns the default (TRUE) so UI doesn't flicker.
 */
export function useFeature(flag: FeatureFlag): boolean {
  const { company } = useCompany();

  const { data } = useQuery({
    queryKey: ['features', company?.id],
    queryFn: async () => {
      if (!company) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('features')
        .eq('id', company.id)
        .single();
      if (error) return null;
      return data as FeaturesRow;
    },
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.features) return true; // default open
  const value = data.features[flag];
  return value === undefined ? true : !!value;
}
