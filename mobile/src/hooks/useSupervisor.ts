import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type SupProject = {
  id: string;
  project_number: string;
  site_name: string;
  client: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

export type PendingReview = {
  id: string;
  status: string;
  instanceLabel: string;
  equipmentType: string;
  testName: string;
  testCode: string;
  projectNumber: string;
  projectId: string;
  rework_reason: string | null;
};

export function useSupProjects(userId: string | null) {
  return useQuery({
    queryKey: ['sup-projects', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, site_name, client, status, start_date, end_date')
        .eq('assigned_to', userId!)
        .is('deleted_at', null)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupProject[];
    },
    enabled: Boolean(userId),
  });
}

export function usePendingReviews(userId: string | null) {
  return useQuery({
    queryKey: ['pending-reviews', userId],
    queryFn: async () => {
      const { data: myProjects } = await supabase
        .from('projects')
        .select('id, project_number')
        .eq('assigned_to', userId!);
      if (!myProjects?.length) return [];

      const projectIds = myProjects.map((p: any) => p.id);
      const projectMap = Object.fromEntries(myProjects.map((p: any) => [p.id, p.project_number]));

      const { data: instances } = await supabase
        .from('equipment_instances')
        .select('id, project_id, label, equipment_type')
        .in('project_id', projectIds);
      if (!instances?.length) return [];

      const instanceIds = instances.map((i: any) => i.id);
      const instanceMap = Object.fromEntries(
        instances.map((i: any) => [i.id, { label: i.label, type: i.equipment_type, projectId: i.project_id }])
      );

      const { data: tasks, error } = await supabase
        .from('test_tasks')
        .select('id, status, rework_reason, equipment_instance_id, test_template:test_templates(test_name, test_code)')
        .in('equipment_instance_id', instanceIds)
        .eq('status', 'SUBMITTED');
      if (error) throw error;

      return (tasks ?? []).map((t: any) => {
        const inst = instanceMap[t.equipment_instance_id] ?? { label: '—', type: '', projectId: '' };
        return {
          id: t.id,
          status: t.status,
          instanceLabel: inst.label,
          equipmentType: inst.type,
          testName: t.test_template?.test_name ?? '—',
          testCode: t.test_template?.test_code ?? '—',
          projectNumber: projectMap[inst.projectId] ?? '—',
          projectId: inst.projectId,
          rework_reason: t.rework_reason ?? null,
        } as PendingReview;
      });
    },
    enabled: Boolean(userId),
  });
}

export function useReviewTask(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      action,
      reason,
    }: {
      taskId: string;
      action: 'APPROVED' | 'REWORK';
      reason?: string;
    }) => {
      const update: Record<string, any> =
        action === 'APPROVED'
          ? { status: 'APPROVED', approved_at: new Date().toISOString(), rework_reason: null }
          : { status: 'REWORK', rework_reason: reason ?? '' };
      const { error } = await supabase
        .from('test_tasks')
        .update(update)
        .eq('id', taskId)
        .eq('status', 'SUBMITTED');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-reviews', userId] });
      qc.invalidateQueries({ queryKey: ['sup-projects', userId] });
    },
  });
}
