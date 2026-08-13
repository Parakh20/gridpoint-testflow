/**
 * Plan-tier entitlements (max users, max active projects, plan-gated features).
 *
 * Backed by the `get_company_entitlements` RPC (Task 3) and the shared
 * `Entitlements`/`FEATURES` types from `@testflow/shared` (Task 6).
 *
 * This is additive to `./features.ts`, which gates a separate, unrelated
 * set of ad-hoc flags (`ai_reports`/`bulk_invite`/`project_clone`/`audit_log_viewer`).
 * Do not conflate the two — a later plan may migrate `useFeature` callers
 * onto plan-backed keys where appropriate.
 */

import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { parseEntitlements, type Entitlements, type EntitlementsRpcResponse, type FeatureKey } from '@testflow/shared';

export function useEntitlements(): { entitlements: Entitlements | null; isLoading: boolean } {
  const { company } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ['entitlements', company?.id],
    queryFn: async () => {
      if (!company) return null;
      const { data, error } = await supabase.rpc('get_company_entitlements', {
        _company_id: company.id,
      });
      if (error) throw error;
      return parseEntitlements(data as unknown as EntitlementsRpcResponse);
    },
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });

  return { entitlements: data ?? null, isLoading };
}

export function useFeatureEntitlement(key: FeatureKey): boolean {
  const { entitlements } = useEntitlements();
  return entitlements?.features[key] ?? false;
}
