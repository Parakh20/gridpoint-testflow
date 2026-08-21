import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { DraftStatusIndicator } from '@/components/DraftStatusIndicator';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, Save, ClipboardCheck, SendHorizonal } from 'lucide-react';
import { InstrumentSelector } from '@/components/InstrumentSelector';
import { TestFormV2 } from '@/components/TestFormV2';
import { EquipmentUnitCard } from '@/components/EquipmentUnitCard';
import { TEMPLATE_FALLBACKS } from '@/lib/templateFallbacks';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { NAMEPLATE_FIELDS, NameplateFieldDef } from '@/lib/nameplateFields';
import { deriveEquipmentStatus, getDraftStatus } from '@/lib/engineerWorkspace';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EquipmentInstance {
  id: string;
  label: string;
  equipment_type: string;
  assigned_to: string | null;
  nameplate: Record<string, any>;
}

interface TestTask {
  id: string;
  status: string;
  rework_reason: string | null;
  equipment_instance: EquipmentInstance | null;
  test_template: { id: string; test_name: string; test_code: string; fields: any } | null;
  existing_record?: any;
}

type Tab = 'nameplate' | 'testing' | 'review';

// ─── Component ───────────────────────────────────────────────────────────────

export default function EngineerProjectDetail() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('nameplate');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [expandedTask] = useState<string | null>(null); // unused, kept for future use
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [nameplateData, setNameplateData] = useState<Record<string, Record<string, any>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savingNameplate, setSavingNameplate] = useState(false);
  const [submittingAll, setSubmittingAll] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data, isLoading: loading } = useQuery({
    queryKey: ['engineer-project-detail', projectId, user?.id],
    queryFn: async () => {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, project_number, site_name, status')
        .eq('id', projectId!)
        .single();

      // test_tasks has no project_id — scope via equipment_instances first
      const { data: allInstances, error: allInstError } = await supabase
        .from('equipment_instances')
        .select('id, label, equipment_type, assigned_to, nameplate')
        .eq('project_id', projectId!);

      if (allInstError) throw allInstError;
      if (!allInstances?.length) return { project: projectData, tasks: [], instances: [], nameplateInit: {}, formInit: {} };

      const allInstanceIds = allInstances.map(i => i.id);

      // Then find only the tasks assigned to this engineer within the project
      const { data: myAssignedTasks, error: assignedErr } = await supabase
        .from('test_tasks')
        .select('id, equipment_instance_id')
        .in('equipment_instance_id', allInstanceIds)
        .eq('assigned_to', user!.id);

      if (assignedErr) throw assignedErr;
      if (!myAssignedTasks?.length) return { project: projectData, tasks: [], instances: [], nameplateInit: {}, formInit: {} };

      const instanceIds = [...new Set(myAssignedTasks.map(t => t.equipment_instance_id))];
      const filteredInstances = allInstances.filter(i => instanceIds.includes(i.id));

      const { data: taskData, error } = await supabase
        .from('test_tasks')
        .select(`
          id, status, rework_reason,
          equipment_instance:equipment_instances(id, label, equipment_type, assigned_to, nameplate),
          test_template:test_templates(id, test_name, test_code, fields)
        `)
        .in('id', myAssignedTasks.map(t => t.id))
        .order('created_at');

      if (error) throw error;

      const taskIds = (taskData || []).map(t => t.id);
      const { data: records } = await supabase
        .from('test_records')
        .select('*')
        .in('test_task_id', taskIds);

      const recordMap = Object.fromEntries((records || []).map(r => [r.test_task_id, r]));
      const enriched = (taskData || []).map(t => ({
        ...t,
        existing_record: recordMap[t.id] || null,
      })) as TestTask[];

      // Pre-fill nameplate data per instance
      const nameplateInit: Record<string, Record<string, any>> = {};
      filteredInstances.forEach(inst => {
        nameplateInit[inst.id] = (inst.nameplate as Record<string, any>) || {};
      });

      // Pre-fill test form data from existing records / localStorage drafts
      const formInit: Record<string, Record<string, any>> = {};
      enriched.forEach(t => {
        if (t.existing_record) {
          formInit[t.id] = {
            ...t.existing_record.payload,
            _remarks: t.existing_record.remarks || '',
            _pass_fail: t.existing_record.pass_fail || '',
            _instrument_id: t.existing_record.instrument_id || '',
          };
        } else {
          try {
            const raw = localStorage.getItem(`testflow_draft_${t.id}`);
            if (raw) formInit[t.id] = JSON.parse(raw);
          } catch { /* corrupted draft */ }
        }
      });

      return { project: projectData, tasks: enriched, instances: filteredInstances, nameplateInit, formInit };
    },
    enabled: !!user && !!projectId,
  });

  const project = data?.project ?? null;
  const tasks = data?.tasks ?? [];

  // Initialise local UI state from query data on first successful load.
  // We track initialisation with a ref so re-fetches (after invalidateQueries)
  // don't overwrite in-progress user edits to nameplate / form data.
  const initialisedRef = useMemo(() => ({ current: false }), [projectId, user?.id]);
  useEffect(() => {
    if (!data || initialisedRef.current) return;
    initialisedRef.current = true;
    setNameplateData(data.nameplateInit);
    setFormData(data.formInit);
    if (!selectedInstanceId && data.instances.length > 0) {
      setSelectedInstanceId(data.instances[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const instances = useMemo<EquipmentInstance[]>(() => {
    const seen = new Set<string>();
    const result: EquipmentInstance[] = [];
    tasks.forEach(t => {
      if (t.equipment_instance && !seen.has(t.equipment_instance.id)) {
        seen.add(t.equipment_instance.id);
        result.push(t.equipment_instance);
      }
    });
    return result;
  }, [tasks]);

  const selectedInstance = useMemo(
    () => instances.find(i => i.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId]
  );

  const instanceTasks = useMemo(
    () => tasks.filter(t => t.equipment_instance?.id === selectedInstanceId),
    [tasks, selectedInstanceId]
  );

  const instanceSummaries = useMemo(
    () =>
      instances.map(inst => {
        const instTasks = tasks.filter(t => t.equipment_instance?.id === inst.id);
        return {
          instance: inst,
          status: deriveEquipmentStatus(instTasks.map(t => t.status), true),
          completedCount: instTasks.filter(t => t.status === 'APPROVED').length,
          totalCount: instTasks.length,
        };
      }),
    [instances, tasks]
  );

  const nameplateFields: NameplateFieldDef[] = selectedInstance
    ? NAMEPLATE_FIELDS[selectedInstance.equipment_type] ?? []
    : [];

  // ── Nameplate handlers ─────────────────────────────────────────────────────

  const handleNameplateChange = (instanceId: string, key: string, value: any) => {
    setNameplateData(prev => ({
      ...prev,
      [instanceId]: { ...(prev[instanceId] || {}), [key]: value },
    }));
  };

  const handleSaveNameplate = async () => {
    if (!selectedInstanceId) return;
    setSavingNameplate(true);
    try {
      const { error } = await supabase
        .from('equipment_instances')
        .update({ nameplate: nameplateData[selectedInstanceId] || {} })
        .eq('id', selectedInstanceId);
      if (error) throw error;
      toast({ title: 'Nameplate data saved' });
    } catch (error: any) {
      toast({ title: 'Error saving nameplate', description: error.message, variant: 'destructive' });
    } finally {
      setSavingNameplate(false);
    }
  };

  // ── Test form handlers ─────────────────────────────────────────────────────

  const draftKey = (taskId: string) => `testflow_draft_${taskId}`;

  const handleFieldChange = (taskId: string, field: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [taskId]: { ...(prev[taskId] || {}), [field]: value } };
      try { localStorage.setItem(draftKey(taskId), JSON.stringify(next[taskId])); } catch { /* storage quota exceeded */ }
      return next;
    });
  };

  const clearDraft = (taskId: string) => {
    try { localStorage.removeItem(draftKey(taskId)); } catch { /* storage unavailable */ }
  };

  const handleSaveTask = async (task: TestTask, submit = false) => {
    if (!user || !task.equipment_instance?.id) return;
    setSaving(task.id);
    try {
      const data = formData[task.id] || {};
      const { _remarks, _pass_fail, _instrument_id, ...payload } = data;

      await supabase.from('test_records').upsert({
        test_task_id: task.id,
        payload,
        remarks: _remarks || null,
        pass_fail: _pass_fail || null,
        instrument_id: _instrument_id || null,
        created_by: user.id,
      }, { onConflict: 'test_task_id' });

      const nextTaskStatus = submit ? 'SUBMITTED' : 'IN_PROGRESS';
      await supabase.from('test_tasks').update(
        submit
          ? { status: 'SUBMITTED', submitted_at: new Date().toISOString(), approved_at: null }
          : { status: 'IN_PROGRESS', submitted_at: null, approved_at: null }
      ).eq('id', task.id);

      const nextTasks = tasks.map(t =>
        t.id === task.id ? { ...t, status: nextTaskStatus } : t
      );
      const nextEquipmentStatus = deriveEquipmentStatus(
        nextTasks
          .filter(t => t.equipment_instance?.id === task.equipment_instance?.id)
          .map(t => t.status),
        true // an assigned engineer is saving a task, so the instance has an assignee by construction
      );
      await supabase.from('equipment_instances')
        .update({ status: nextEquipmentStatus })
        .eq('id', task.equipment_instance.id);

      clearDraft(task.id);
      toast({ title: submit ? 'Test submitted for review' : 'Readings saved' });
      queryClient.invalidateQueries({ queryKey: ['engineer-project-detail', projectId, user?.id] });
    } catch (error: any) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleSubmitAll = async () => {
    if (!user || !selectedInstanceId) return;
    const submittable = instanceTasks.filter(t =>
      t.status !== 'SUBMITTED' && t.status !== 'APPROVED'
    );
    if (submittable.length === 0) {
      toast({ title: 'All tests already submitted or approved' });
      return;
    }
    setSubmittingAll(true);
    try {
      for (const task of submittable) {
        await handleSaveTask(task, true);
      }
      toast({ title: 'All tests submitted for review' });
    } finally {
      setSubmittingAll(false);
    }
  };

  // ── V1 field renderer (fallback for legacy templates) ──────────────────────

  const renderLegacyField = (taskId: string, fieldKey: string, fieldSchema: any) => {
    const value = formData[taskId]?.[fieldKey] ?? '';
    const label = fieldSchema.title || fieldKey;
    if (fieldSchema.enum) {
      return (
        <div key={fieldKey} className="space-y-1">
          <Label>{label}</Label>
          <Select value={value} onValueChange={v => handleFieldChange(taskId, fieldKey, v)}>
            <SelectTrigger><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
            <SelectContent>
              {fieldSchema.enum.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <div key={fieldKey} className="space-y-1">
        <Label>{label}{fieldSchema.unit ? ` (${fieldSchema.unit})` : ''}</Label>
        <Input
          type={fieldSchema.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={e => handleFieldChange(taskId, fieldKey, fieldSchema.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
          placeholder={label}
        />
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout title="Project Tasks">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'nameplate', label: 'Nameplate Details' },
    { id: 'testing', label: 'Testing Parameters' },
    { id: 'review', label: 'Review & Submit' },
  ];

  const allSubmitted = instanceTasks.length > 0 &&
    instanceTasks.every(t => t.status === 'SUBMITTED' || t.status === 'APPROVED');

  return (
    <DashboardLayout title="Project Tasks">
      <div className="space-y-6">
        {/* Back + project header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/engineer')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {project && (
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{project.project_number}</h2>
            <StatusBadge status={project.status} />
            <span className="text-muted-foreground">{project.site_name}</span>
          </div>
        )}

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No test tasks assigned for this project.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Equipment Selector ─────────────────────────────────────── */}
            <Card>
              <CardContent className="py-4">
                <p className="text-micro-label uppercase text-muted-foreground mb-2">
                  Equipment Unit ({instances.length} total)
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {instanceSummaries.map(({ instance, status, completedCount, totalCount }) => (
                    <EquipmentUnitCard
                      key={instance.id}
                      label={instance.label}
                      equipmentType={instance.equipment_type}
                      status={status}
                      completedCount={completedCount}
                      totalCount={totalCount}
                      selected={instance.id === selectedInstanceId}
                      onSelect={() => setSelectedInstanceId(instance.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedInstance && (
              <>
                {/* ── Tab navigation ─────────────────────────────────────── */}
                <div className="border-b">
                  <nav className="flex gap-1">
                    {TABS.map((tab, idx) => (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="mr-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-muted">
                          {idx + 1}
                        </span>
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    TAB 1 — Nameplate Details
                ══════════════════════════════════════════════════════════ */}
                {activeTab === 'nameplate' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        Equipment Nameplate Information
                        <span className="text-xs font-normal text-muted-foreground">
                          — {selectedInstance.label}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {nameplateFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No nameplate fields defined for {selectedInstance.equipment_type.replace(/_/g, ' ')}.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          {nameplateFields.map(f => (
                            <div
                              key={f.key}
                              className={`space-y-1 ${f.span === 'full' ? 'col-span-2' : ''}`}
                            >
                              <Label>
                                {f.label}
                                {f.unit ? <span className="text-muted-foreground font-normal"> ({f.unit})</span> : ''}
                              </Label>
                              <Input
                                type={f.type === 'number' ? 'number' : 'text'}
                                value={nameplateData[selectedInstanceId]?.[f.key] ?? ''}
                                onChange={e =>
                                  handleNameplateChange(
                                    selectedInstanceId,
                                    f.key,
                                    f.type === 'number' ? (parseFloat(e.target.value) || '') : e.target.value
                                  )
                                }
                                placeholder={f.label}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          Save before moving to Testing Parameters.
                        </p>
                        <Button onClick={handleSaveNameplate} disabled={savingNameplate}>
                          {savingNameplate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          <Save className="h-4 w-4 mr-2" />
                          Save Nameplate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TAB 2 — Testing Parameters (single continuous form)
                ══════════════════════════════════════════════════════════ */}
                {activeTab === 'testing' && (
                  <div className="space-y-0">
                    {instanceTasks.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                          No tests assigned for this equipment unit.
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        {/* Sticky action bar */}
                        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30 sticky top-0 z-10">
                          <p className="text-sm font-medium">
                            {selectedInstance?.label} — {instanceTasks.length} test{instanceTasks.length !== 1 ? 's' : ''}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!!saving || submittingAll}
                              onClick={async () => {
                                const editable = instanceTasks.filter(t => t.status !== 'SUBMITTED' && t.status !== 'APPROVED');
                                for (const t of editable) await handleSaveTask(t, false);
                              }}
                            >
                              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                              Save All Drafts
                            </Button>
                            <Button
                              size="sm"
                              disabled={!!saving || submittingAll || allSubmitted}
                              onClick={handleSubmitAll}
                            >
                              {submittingAll ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <SendHorizonal className="h-4 w-4 mr-1" />}
                              Submit All
                            </Button>
                          </div>
                        </div>

                        <CardContent className="p-0 divide-y">
                          {instanceTasks.map((task, taskIdx) => {
                            const rawFields = task.test_template?.fields;
                            let parsedFields: any = null;
                            try { parsedFields = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields; } catch { /* invalid JSON */ }
                            // Use hardcoded fallback schema when DB still has v1 template
                            const testCode = task.test_template?.test_code ?? '';
                            const effectiveSchema = (parsedFields?.version === 2)
                              ? parsedFields
                              : (TEMPLATE_FALLBACKS[testCode] ?? parsedFields);
                            const isV2 = effectiveSchema?.version === 2;
                            const v2Sections = isV2 ? (effectiveSchema?.sections ?? []) : [];
                            const fields = (!isV2 && parsedFields?.properties) || {};
                            const isReadonly = task.status === 'SUBMITTED' || task.status === 'APPROVED';

                            return (
                              <div key={task.id} className="p-6 space-y-4">
                                {/* Section header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                      {taskIdx + 1}
                                    </span>
                                    <div>
                                      <p className="font-semibold text-sm">{task.test_template?.test_name}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{task.test_template?.test_code}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <DraftStatusIndicator status={getDraftStatus(task, formData[task.id])} />
                                    <StatusBadge status={task.status} />
                                  </div>
                                </div>

                                {task.status === 'REWORK' && task.rework_reason && (
                                  <div className="rounded border border-orange-200 bg-orange-50 p-3">
                                    <p className="text-xs font-semibold text-orange-700 uppercase mb-1">Rework Required</p>
                                    <p className="text-sm text-orange-900">{task.rework_reason}</p>
                                  </div>
                                )}

                                {/* Test form */}
                                {isV2 ? (
                                  <TestFormV2
                                    taskId={task.id}
                                    sections={v2Sections}
                                    formData={formData[task.id] || {}}
                                    onChange={(key, value) => handleFieldChange(task.id, key, value)}
                                    isReadonly={isReadonly}
                                  />
                                ) : Object.keys(fields).length > 0 ? (
                                  <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(fields).map(([key, schema]: [string, any]) =>
                                      renderLegacyField(task.id, key, schema)
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <Label>Reading Value</Label>
                                    <Input
                                      type="number"
                                      value={formData[task.id]?.reading ?? ''}
                                      onChange={e => handleFieldChange(task.id, 'reading', parseFloat(e.target.value) || '')}
                                      placeholder="Enter measured value"
                                      disabled={isReadonly}
                                    />
                                  </div>
                                )}

                                {/* Per-test instrument / pass-fail / remarks */}
                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dashed">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Instrument Used</Label>
                                    <InstrumentSelector
                                      value={formData[task.id]?._instrument_id || ''}
                                      onChange={v => handleFieldChange(task.id, '_instrument_id', v)}
                                      disabled={isReadonly}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Pass / Fail</Label>
                                    <Select
                                      value={formData[task.id]?._pass_fail || ''}
                                      onValueChange={v => handleFieldChange(task.id, '_pass_fail', v)}
                                      disabled={isReadonly}
                                    >
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select result" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="PASS">Pass</SelectItem>
                                        <SelectItem value="FAIL">Fail</SelectItem>
                                        <SelectItem value="MARGINAL">Marginal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Remarks</Label>
                                  <Textarea
                                    className="text-xs"
                                    value={formData[task.id]?._remarks || ''}
                                    onChange={e => handleFieldChange(task.id, '_remarks', e.target.value)}
                                    placeholder="Observations or notes…"
                                    disabled={isReadonly}
                                    rows={2}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    TAB 3 — Review & Submit
                ══════════════════════════════════════════════════════════ */}
                {activeTab === 'review' && (
                  <div className="space-y-4">
                    {/* Nameplate summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Equipment Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <tbody>
                              {nameplateFields.map(f => {
                                const val = nameplateData[selectedInstanceId]?.[f.key];
                                return (
                                  <tr key={f.key} className="border-b last:border-0">
                                    <td className="py-2 pr-4 text-muted-foreground font-medium w-1/2">
                                      {f.label}{f.unit ? ` (${f.unit})` : ''}
                                    </td>
                                    <td className={`py-2 ${!val ? 'text-muted-foreground italic' : ''}`}>
                                      {val !== undefined && val !== '' ? String(val) : 'Not specified'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Test summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Test Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {instanceTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between py-2 border-b last:border-0">
                              <div>
                                <p className="text-sm font-medium">{task.test_template?.test_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{task.test_template?.test_code}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                {formData[task.id]?._pass_fail && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                    formData[task.id]._pass_fail === 'PASS'
                                      ? 'bg-green-100 text-green-700'
                                      : formData[task.id]._pass_fail === 'FAIL'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {formData[task.id]._pass_fail}
                                  </span>
                                )}
                                <StatusBadge status={task.status} />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            <p>
                              {instanceTasks.filter(t => t.status === 'SUBMITTED' || t.status === 'APPROVED').length}
                              {' '}/ {instanceTasks.length} tests submitted
                            </p>
                            {allSubmitted && (
                              <p className="text-green-600 font-medium flex items-center gap-1">
                                <ClipboardCheck className="h-4 w-4" />
                                All tests submitted
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={handleSubmitAll}
                            disabled={submittingAll || allSubmitted}
                            size="lg"
                          >
                            {submittingAll
                              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              : <SendHorizonal className="h-4 w-4 mr-2" />
                            }
                            Submit Equipment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
