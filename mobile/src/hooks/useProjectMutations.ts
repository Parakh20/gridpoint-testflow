import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export type ProjectFields = {
  project_number: string;
  site_name: string;
  site_address: string;
  client: string | null;
  start_date: string | null;   // 'YYYY-MM-DD' or null
  end_date: string | null;     // 'YYYY-MM-DD' or null
};

export type ProjectDetail = ProjectFields & {
  id: string;
  status: string;
  assigned_to: string | null;
  created_by: string;
};

// ── Fetch single project for editing ─────────────────────────────────────────

async function fetchProject(projectId: string): Promise<ProjectDetail> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_number, site_name, site_address, client, status, start_date, end_date, assigned_to, created_by')
    .eq('id', projectId)
    .single();
  if (error) throw error;
  return data as ProjectDetail;
}

export function useProjectDetail(projectId: string) {
  return useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => fetchProject(projectId),
  });
}

// ── Create project ────────────────────────────────────────────────────────────

type CreateInput = ProjectFields & { createdBy: string; companyId: string };

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInput) => {
      const { error } = await supabase.from('projects').insert({
        project_number: input.project_number,
        site_name: input.site_name,
        site_address: input.site_address,
        client: input.client || null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        created_by: input.createdBy,
        company_id: input.companyId,
        status: 'DRAFT',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gm-projects'] });
    },
  });
}

// ── Update project ────────────────────────────────────────────────────────────

type UpdateInput = {
  projectId: string;
  fields: Partial<ProjectFields>;
  newStatus?: string;
  currentStatus?: string;
};

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateInput) => {
      // Update metadata fields
      if (Object.keys(input.fields).length > 0) {
        const { error } = await supabase
          .from('projects')
          .update(input.fields)
          .eq('id', input.projectId);
        if (error) throw error;
      }
      // Update status separately with optimistic-concurrency guard
      if (input.newStatus && input.currentStatus && input.newStatus !== input.currentStatus) {
        const { error } = await supabase
          .from('projects')
          .update({ status: input.newStatus })
          .eq('id', input.projectId)
          .eq('status', input.currentStatus);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['gm-projects'] });
      qc.invalidateQueries({ queryKey: ['project-overview', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['project-detail', variables.projectId] });
    },
  });
}

// ── Soft-delete project (SUPERADMIN only) ────────────────────────────────────

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gm-projects'] });
    },
  });
}
