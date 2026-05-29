import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { EQUIPMENT_TYPES, type EquipmentType } from '@/hooks/useScopeItems';

// Mirrors the web ProjectTestingScopeTab: choose which test templates apply
// per scoped equipment type (project_test_scope), then generate equipment
// instances + test tasks via the server-side generate_project_equipment RPC.

export type TemplateToggle = {
  id: string;
  testName: string;
  testCode: string;
  tab: string;
  isEnabled: boolean;
};

export type TestScopeGroup = {
  equipmentType: EquipmentType;
  label: string;
  templates: TemplateToggle[];
};

export type TestScopeData = {
  groups: TestScopeGroup[];
  alreadyGenerated: boolean;
};

const LABEL_BY_TYPE = Object.fromEntries(
  EQUIPMENT_TYPES.map((e) => [e.type, e.label])
) as Record<EquipmentType, string>;

async function fetchTestScope(projectId: string): Promise<TestScopeData> {
  const [scopeRes, instancesRes] = await Promise.all([
    supabase.from('scope_items').select('equipment_type, quantity').eq('project_id', projectId),
    supabase.from('equipment_instances').select('id').eq('project_id', projectId).limit(1),
  ]);
  if (scopeRes.error) throw scopeRes.error;

  const equipmentTypes = [
    ...new Set((scopeRes.data ?? []).filter((s: any) => s.quantity > 0).map((s: any) => s.equipment_type)),
  ] as EquipmentType[];
  const alreadyGenerated = !!instancesRes.data?.length;

  if (equipmentTypes.length === 0) {
    return { groups: [], alreadyGenerated };
  }

  const [templatesRes, scopeConfigRes] = await Promise.all([
    supabase
      .from('test_templates')
      .select('id, test_name, test_code, tab, equipment_type')
      .in('equipment_type', equipmentTypes)
      .eq('is_active', true),
    supabase.from('project_test_scope').select('test_template_id, is_enabled').eq('project_id', projectId),
  ]);
  if (templatesRes.error) throw templatesRes.error;
  if (scopeConfigRes.error) throw scopeConfigRes.error;

  const enabledMap = new Map<string, boolean>(
    (scopeConfigRes.data ?? []).map((s: any) => [s.test_template_id, s.is_enabled])
  );

  const groups: TestScopeGroup[] = equipmentTypes.map((type) => {
    const templates = (templatesRes.data ?? [])
      .filter((t: any) => t.equipment_type === type)
      .map((t: any) => ({
        id: t.id,
        testName: t.test_name,
        testCode: t.test_code,
        tab: t.tab,
        // Default ON for templates with no saved row yet (matches web).
        isEnabled: enabledMap.has(t.id) ? !!enabledMap.get(t.id) : true,
      }));
    return { equipmentType: type, label: LABEL_BY_TYPE[type] ?? type, templates };
  });

  return { groups, alreadyGenerated };
}

export function useTestScope(projectId: string) {
  return useQuery({
    queryKey: ['test-scope', projectId],
    queryFn: () => fetchTestScope(projectId),
  });
}

// ── Save test selections (delete-then-insert, matching web + CLAUDE.md) ────────

type SaveTestScopeInput = {
  projectId: string;
  groups: TestScopeGroup[];
};

export function useSaveTestScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, groups }: SaveTestScopeInput) => {
      const { error: delErr } = await supabase
        .from('project_test_scope')
        .delete()
        .eq('project_id', projectId);
      if (delErr) throw delErr;

      const records = groups.flatMap((g) =>
        g.templates.map((t) => ({
          project_id: projectId,
          equipment_type: g.equipmentType,
          test_template_id: t.id,
          is_enabled: t.isEnabled,
        }))
      );
      if (records.length === 0) return;

      const { error } = await supabase.from('project_test_scope').insert(records);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['test-scope', variables.projectId] });
    },
  });
}

// ── Generate equipment instances + test tasks (server RPC) ────────────────────

type GenerateResult = {
  generated_instances: number;
  generated_tasks: number;
  already_existed: boolean;
};

export function useGenerateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string): Promise<GenerateResult> => {
      const { data, error } = await supabase.rpc('generate_project_equipment', {
        _project_id: projectId,
      });
      if (error) throw error;
      return data as unknown as GenerateResult;
    },
    onSuccess: (_data, projectId) => {
      qc.invalidateQueries({ queryKey: ['test-scope', projectId] });
      qc.invalidateQueries({ queryKey: ['project-overview', projectId] });
      qc.invalidateQueries({ queryKey: ['project-instances', projectId] });
    },
  });
}
