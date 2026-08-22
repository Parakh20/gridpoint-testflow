import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { sortPendingReviewsByProject } from '@testflow/shared';

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

      return sortPendingReviewsByProject(
        (tasks ?? []).map((t: any) => {
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
        })
      );
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
      if (!userId) throw new Error('Not authenticated');

      // Ownership pre-flight: confirm the task belongs to a project assigned
      // to this supervisor. This mirrors the RLS policy and provides a clear
      // error before hitting the DB update. Two steps because PostgREST nested
      // column filters on deeply-joined tables are not reliable in the JS client.

      // Step 1: resolve the project that owns this task
      const { data: taskRow, error: taskErr } = await supabase
        .from('test_tasks')
        .select('id, equipment_instance_id, equipment_instances!inner(project_id)')
        .eq('id', taskId)
        .eq('status', 'SUBMITTED')
        .maybeSingle();
      if (taskErr) throw taskErr;
      if (!taskRow) throw new Error('Task not found or no longer in SUBMITTED status');

      const projectId = (taskRow as any).equipment_instances?.project_id as string | undefined;
      if (!projectId) throw new Error('Could not determine project for this task');

      // Step 2: verify this supervisor owns the project
      const { data: projectRow, error: projErr } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('assigned_to', userId)
        .maybeSingle();
      if (projErr) throw projErr;
      if (!projectRow) throw new Error('Not authorised: this task belongs to another supervisor\'s project');

      // Ownership confirmed — perform the review action
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
