import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryClient';
import { labelForEquipment } from '@testflow/shared';

export type TaskRow = {
  id: string;
  status: string;
  rework_reason: string | null;
  templateId: string;
  templateCode: string;
  templateName: string;
  templateTab: string;
  equipmentType: string;
  seq: number;
  instanceLabel: string;
};

async function fetchTasks(userId: string, projectId: string): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from('test_tasks')
    .select(
      `id, status, rework_reason,
       test_template:test_templates ( id, test_code, test_name, tab, equipment_type ),
       equipment_instance:equipment_instances ( id, project_id, equipment_type, seq_number )`
    )
    .eq('assigned_to', userId);

  if (error) throw error;
  if (!data) return [];

  const filtered = (data as any[]).filter(
    (r) => r.equipment_instance?.project_id === projectId
  );

  const mapped: TaskRow[] = filtered
    .filter((r) => r.test_template && r.equipment_instance)
    .map((r) => {
      const eq = (r.equipment_instance.equipment_type as string) ?? 'UNKNOWN';
      const rawSeq = r.equipment_instance.seq_number;
      const seq = typeof rawSeq === 'number' && Number.isFinite(rawSeq) ? rawSeq : 0;
      const prefix = labelForEquipment(eq);
      return {
        id: r.id,
        status: r.status,
        rework_reason: r.rework_reason,
        templateId: r.test_template.id,
        templateCode: r.test_template.test_code,
        templateName: r.test_template.test_name,
        templateTab: r.test_template.tab,
        equipmentType: eq,
        seq,
        instanceLabel: `${prefix}-${String(seq).padStart(3, '0')}`,
      };
    });

  mapped.sort((a, b) => {
    if (a.instanceLabel !== b.instanceLabel) return a.instanceLabel.localeCompare(b.instanceLabel);
    return a.templateCode.localeCompare(b.templateCode);
  });
  return mapped;
}

export function useTasks(userId: string | null, projectId: string) {
  return useQuery({
    queryKey: qk.tasks(userId ?? '', projectId),
    queryFn: () => fetchTasks(userId as string, projectId),
    enabled: Boolean(userId && projectId),
  });
}
