import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Read-only report viewing on mobile. Mirrors the web ReportsList +
// ReportProjectDetail data model (same tables/columns) so the numbers match.
// PDF / Excel export stays web-only.

export type ReportProject = {
  id: string;
  project_number: string;
  site_name: string;
  client: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

async function fetchReportProjects(): Promise<ReportProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_number, site_name, client, status, start_date, end_date')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReportProject[];
}

export function useReportProjects() {
  return useQuery({ queryKey: ['report-projects'], queryFn: fetchReportProjects });
}

// ── Report detail ──────────────────────────────────────────────────────────

export type ReportTask = {
  id: string;
  status: string;
  reworkReason: string | null;
  engineerName: string | null;
  testName: string;
  testCode: string;
  passFail: string | null;
  remarks: string | null;
  payload: Record<string, any>;
};

export type ReportEquipmentGroup = {
  instanceId: string;
  label: string;
  equipmentType: string;
  nameplate: Record<string, any>;
  tasks: ReportTask[];
};

export type ReportDetail = {
  project: ReportProject & { site_address: string | null; managerName: string | null };
  stats: { total: number; approved: number; submitted: number; inProgress: number; draft: number };
  groups: ReportEquipmentGroup[];
};

async function fetchReportDetail(projectId: string): Promise<ReportDetail> {
  const { data: proj, error: projErr } = await supabase
    .from('projects')
    .select('id, project_number, site_name, site_address, client, status, start_date, end_date, assigned_to')
    .eq('id', projectId)
    .single();
  if (projErr) throw projErr;

  let managerName: string | null = null;
  if ((proj as any).assigned_to) {
    const { data: mgr } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', (proj as any).assigned_to)
      .maybeSingle();
    managerName = mgr?.name ?? null;
  }

  const projectOut = {
    id: proj.id,
    project_number: proj.project_number,
    site_name: proj.site_name,
    site_address: (proj as any).site_address ?? null,
    client: proj.client ?? null,
    status: proj.status,
    start_date: proj.start_date ?? null,
    end_date: proj.end_date ?? null,
    managerName,
  };

  const emptyStats = { total: 0, approved: 0, submitted: 0, inProgress: 0, draft: 0 };

  const { data: instances, error: instErr } = await supabase
    .from('equipment_instances')
    .select('id')
    .eq('project_id', projectId)
    .is('deleted_at', null);
  if (instErr) throw instErr;
  if (!instances?.length) return { project: projectOut, stats: emptyStats, groups: [] };

  const instanceIds = instances.map((i: any) => i.id);
  const { data: taskData, error: taskErr } = await supabase
    .from('test_tasks')
    .select(`
      id, status, rework_reason, assigned_to,
      equipment_instance:equipment_instances(id, label, equipment_type, nameplate, seq_number),
      test_template:test_templates(test_name, test_code)
    `)
    .in('equipment_instance_id', instanceIds)
    .order('created_at');
  if (taskErr) throw taskErr;

  const tasks = (taskData ?? []) as any[];
  const taskIds = tasks.map((t) => t.id);

  const { data: records } = await supabase
    .from('test_records')
    .select('test_task_id, payload, instrument_id, pass_fail, remarks')
    .in('test_task_id', taskIds);
  const recordMap = Object.fromEntries((records ?? []).map((r: any) => [r.test_task_id, r]));

  const engineerIds = [...new Set(tasks.map((t) => t.assigned_to).filter(Boolean))];
  let engMap: Record<string, string> = {};
  if (engineerIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', engineerIds);
    engMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.name ?? p.email ?? 'Unknown']));
  }

  const stats = {
    total: tasks.length,
    approved: tasks.filter((t) => t.status === 'APPROVED').length,
    submitted: tasks.filter((t) => t.status === 'SUBMITTED').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    draft: tasks.filter((t) => t.status === 'DRAFT').length,
  };

  const grouped = new Map<string, ReportEquipmentGroup>();
  for (const t of tasks) {
    const inst = t.equipment_instance;
    if (!inst) continue;
    if (!grouped.has(inst.id)) {
      grouped.set(inst.id, {
        instanceId: inst.id,
        label: inst.label,
        equipmentType: inst.equipment_type,
        nameplate: (inst.nameplate as Record<string, any>) ?? {},
        tasks: [],
      });
    }
    const rec = recordMap[t.id];
    grouped.get(inst.id)!.tasks.push({
      id: t.id,
      status: t.status,
      reworkReason: t.rework_reason ?? null,
      engineerName: t.assigned_to ? (engMap[t.assigned_to] ?? null) : null,
      testName: t.test_template?.test_name ?? '—',
      testCode: t.test_template?.test_code ?? '—',
      passFail: rec?.pass_fail ?? null,
      remarks: rec?.remarks ?? null,
      payload: (rec?.payload as Record<string, any>) ?? {},
    });
  }

  return { project: projectOut, stats, groups: [...grouped.values()] };
}

export function useReportDetail(projectId: string) {
  return useQuery({
    queryKey: ['report-detail', projectId],
    queryFn: () => fetchReportDetail(projectId),
    enabled: Boolean(projectId),
  });
}
