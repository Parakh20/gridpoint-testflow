import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { parseUsage, type UsageSnapshot, type UsageRpcResponse } from '@testflow/shared';

export function useUsage(): { usage: UsageSnapshot | null; isLoading: boolean } {
  const { company } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ['usage', company?.id],
    queryFn: async () => {
      if (!company) return null;
      const { data, error } = await supabase.rpc('get_company_usage', {
        _company_id: company.id,
      });
      if (error) throw error;
      return parseUsage(data as unknown as UsageRpcResponse);
    },
    enabled: !!company,
    staleTime: 5 * 60 * 1000,
  });

  return { usage: data ?? null, isLoading };
}
