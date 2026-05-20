import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryClient';

export type Project = {
  id: string;
  project_number: string;
  site_name: string;
  client: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

async function fetchEngineerProjects(userId: string): Promise<Project[]> {
  const { data: taskRows, error: taskErr } = await supabase
    .from('test_tasks')
    .select('equipment_instance_id')
    .eq('assigned_to', userId);
  if (taskErr) throw taskErr;

  const instanceIds = Array.from(
    new Set((taskRows ?? []).map((r: any) => r.equipment_instance_id))
  );
  if (instanceIds.length === 0) return [];

  const { data: instRows, error: instErr } = await supabase
    .from('equipment_instances')
    .select('project_id')
    .in('id', instanceIds);
  if (instErr) throw instErr;

  const projectIds = Array.from(new Set((instRows ?? []).map((r: any) => r.project_id)));
  if (projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id, project_number, site_name, client, status, start_date, end_date')
    .in('id', projectIds)
    .is('deleted_at', null)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export function useProjects(userId: string | null) {
  return useQuery({
    queryKey: qk.projects(userId ?? ''),
    queryFn: () => fetchEngineerProjects(userId as string),
    enabled: Boolean(userId),
  });
}
