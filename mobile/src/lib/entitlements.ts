/**
 * Plan-tier entitlements on mobile (max users, max active projects,
 * plan-gated features), backed by the `get_company_entitlements` RPC.
 *
 * Mirrors frontend/src/lib/entitlements.ts. The only structural difference is
 * where the company id comes from: the web app has a CompanyContext resolved
 * from the host, while mobile has no host at all and reads the company off the
 * signed-in user's profile. Both end up at the same RPC with the same id.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  parseEntitlements,
  type Entitlements,
  type EntitlementsRpcResponse,
  type FeatureKey,
} from '@testflow/shared';

const ENTITLEMENTS_STALE_MS = 5 * 60 * 1000;

export function useEntitlements(): { entitlements: Entitlements | null; isLoading: boolean } {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['entitlements', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.rpc('get_company_entitlements', {
        _company_id: companyId,
      });
      if (error) throw error;
      return parseEntitlements(data as unknown as EntitlementsRpcResponse);
    },
    enabled: !!companyId,
    staleTime: ENTITLEMENTS_STALE_MS,
  });

  return { entitlements: data ?? null, isLoading };
}

export function useFeatureEntitlement(key: FeatureKey): boolean {
  const { entitlements } = useEntitlements();
  return entitlements?.features[key] ?? false;
}
