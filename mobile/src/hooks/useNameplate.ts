import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useNameplate(instanceId: string) {
  return useQuery({
    queryKey: ['nameplate', instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_instances')
        .select('nameplate')
        .eq('id', instanceId)
        .maybeSingle();
      if (error) throw error;
      return (data?.nameplate as Record<string, any>) ?? {};
    },
    enabled: Boolean(instanceId),
  });
}

export function useSaveNameplate(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nameplate: Record<string, any>) => {
      const { error } = await supabase
        .from('equipment_instances')
        .update({ nameplate })
        .eq('id', instanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nameplate', instanceId] });
    },
  });
}
