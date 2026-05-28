import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type EquipmentType =
  | 'POWER_TRANSFORMER' | 'CT' | 'CVT' | 'LA'
  | 'SF6_BREAKER' | 'ISOLATOR' | 'VCB' | 'EARTH_PIT';

export const EQUIPMENT_TYPES: { type: EquipmentType; label: string }[] = [
  { type: 'POWER_TRANSFORMER', label: 'Power Transformer' },
  { type: 'CT',                label: 'Current Transformer' },
  { type: 'CVT',               label: 'Capacitive VT' },
  { type: 'LA',                label: 'Lightning Arrester' },
  { type: 'SF6_BREAKER',       label: 'SF6 Breaker' },
  { type: 'ISOLATOR',          label: 'Isolator' },
  { type: 'VCB',               label: 'Vacuum Circuit Breaker' },
  { type: 'EARTH_PIT',         label: 'Earth Pit' },
];

export type ScopeRow = { equipment_type: EquipmentType; quantity: number };

async function fetchScopeItems(projectId: string): Promise<ScopeRow[]> {
  const { data, error } = await supabase
    .from('scope_items')
    .select('equipment_type, quantity')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data ?? []) as ScopeRow[];
}

export function useScopeItems(projectId: string) {
  return useQuery({
    queryKey: ['scope-items', projectId],
    queryFn: () => fetchScopeItems(projectId),
  });
}

type SaveScopeInput = {
  projectId: string;
  rows: ScopeRow[];   // all 8 types, quantity 0–500
};

export function useSaveScopeItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, rows }: SaveScopeInput) => {
      // Delete existing rows first, then insert — simpler than upsert with enum PK
      const { error: delErr } = await supabase
        .from('scope_items')
        .delete()
        .eq('project_id', projectId);
      if (delErr) throw delErr;

      const nonZero = rows.filter((r) => r.quantity > 0);
      if (nonZero.length === 0) return;

      const { error } = await supabase.from('scope_items').insert(
        nonZero.map((r) => ({
          project_id: projectId,
          equipment_type: r.equipment_type,
          quantity: r.quantity,
        }))
      );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['scope-items', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['project-overview', variables.projectId] });
    },
  });
}
