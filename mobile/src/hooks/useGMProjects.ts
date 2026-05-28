import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type GMProject = {
  id: string;
  project_number: string;
  site_name: string;
  client: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  assigned_supervisor_name: string | null;
};

async function fetchAllProjects(): Promise<GMProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_number, site_name, client, status, start_date, end_date, assigned_to')
    .is('deleted_at', null)
    .order('start_date', { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];

  const supervisorIds = [...new Set(data.map((p: any) => p.assigned_to).filter(Boolean))];
  let nameMap: Record<string, string> = {};
  if (supervisorIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', supervisorIds);
    nameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.name]));
  }

  return data.map((p: any) => ({
    id: p.id,
    project_number: p.project_number,
    site_name: p.site_name,
    client: p.client ?? null,
    status: p.status,
    start_date: p.start_date ?? null,
    end_date: p.end_date ?? null,
    assigned_supervisor_name: p.assigned_to ? (nameMap[p.assigned_to] ?? null) : null,
  }));
}

export function useGMProjects() {
  return useQuery({
    queryKey: ['gm-projects'],
    queryFn: fetchAllProjects,
  });
}
