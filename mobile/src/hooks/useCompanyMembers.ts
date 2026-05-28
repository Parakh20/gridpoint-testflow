import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Member = { id: string; name: string; email: string };

export type InstanceWithAssignee = {
  id: string;
  label: string;
  equipment_type: string;
  assigned_to: string | null;
  assignee_name: string | null;
};

// ── Supervisor list ───────────────────────────────────────────────────────────

async function fetchCompanySupervisors(): Promise<Member[]> {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'SUPERVISOR');
  if (error) throw error;
  if (!roles?.length) return [];
  const ids = roles.map((r: any) => r.user_id);
  const { data: profiles, error: pe } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', ids)
    .eq('is_active', true);
  if (pe) throw pe;
  return (profiles ?? []).map((p: any) => ({ id: p.id, name: p.name, email: p.email }));
}

export function useCompanySupervisors() {
  return useQuery({ queryKey: ['company-supervisors'], queryFn: fetchCompanySupervisors });
}

// ── Engineer list ─────────────────────────────────────────────────────────────

async function fetchCompanyEngineers(): Promise<Member[]> {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'ENGINEER');
  if (error) throw error;
  if (!roles?.length) return [];
  const ids = roles.map((r: any) => r.user_id);
  const { data: profiles, error: pe } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', ids)
    .eq('is_active', true);
  if (pe) throw pe;
  return (profiles ?? []).map((p: any) => ({ id: p.id, name: p.name, email: p.email }));
}

export function useCompanyEngineers() {
  return useQuery({ queryKey: ['company-engineers'], queryFn: fetchCompanyEngineers });
}

// ── Project instances with assignee names ─────────────────────────────────────

async function fetchProjectInstances(projectId: string): Promise<InstanceWithAssignee[]> {
  const { data: instances, error } = await supabase
    .from('equipment_instances')
    .select('id, label, equipment_type, assigned_to')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('seq_number');
  if (error) throw error;
  if (!instances?.length) return [];

  const assignedIds = [
    ...new Set(instances.filter((i: any) => i.assigned_to).map((i: any) => i.assigned_to)),
  ];
  let nameMap: Record<string, string> = {};
  if (assignedIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', assignedIds);
    nameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.name]));
  }

  return instances.map((i: any) => ({
    id: i.id,
    label: i.label,
    equipment_type: i.equipment_type,
    assigned_to: i.assigned_to,
    assignee_name: i.assigned_to ? (nameMap[i.assigned_to] ?? null) : null,
  }));
}

export function useProjectInstances(projectId: string) {
  return useQuery({
    queryKey: ['project-instances', projectId],
    queryFn: () => fetchProjectInstances(projectId),
  });
}

// ── Assign supervisor to project ──────────────────────────────────────────────

type AssignSupervisorInput = {
  projectId: string;
  supervisorId: string | null;   // null = remove
  callerId: string;
  callerRole: string;
};

export function useAssignSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignSupervisorInput) => {
      const { error } = await supabase
        .from('projects')
        .update({ assigned_to: input.supervisorId })
        .eq('id', input.projectId);
      if (error) throw error;

      // Record GM→Supervisor relationship when a GM assigns
      if (input.callerRole === 'GM' && input.supervisorId) {
        await supabase.from('supervisor_assignments').upsert(
          {
            gm_id: input.callerId,
            supervisor_id: input.supervisorId,
            created_by: input.callerId,
          },
          { onConflict: 'gm_id,supervisor_id' }
        );
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['gm-projects'] });
      qc.invalidateQueries({ queryKey: ['project-overview', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['project-detail', variables.projectId] });
    },
  });
}

// ── Assign engineer to equipment instance ─────────────────────────────────────

type AssignEngineerInput = {
  instanceId: string;
  engineerId: string | null;   // null = unassign
  projectId: string;
};

export function useAssignEngineer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignEngineerInput) => {
      const { error } = await supabase
        .from('equipment_instances')
        .update({ assigned_to: input.engineerId })
        .eq('id', input.instanceId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['project-instances', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['project-overview', variables.projectId] });
    },
  });
}
