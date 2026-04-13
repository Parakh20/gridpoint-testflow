import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, Save, HardDrive, ClipboardCheck, SendHorizonal } from 'lucide-react';
import { InstrumentSelector } from '@/components/InstrumentSelector';
import { TestFormV2 } from '@/components/TestFormV2';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ─── Nameplate field definitions per equipment type ─────────────────────────

interface NameplateField {
  key: string;
  label: string;
  type?: 'text' | 'number';
  unit?: string;
  span?: 'full';
}

const NAMEPLATE_FIELDS: Record<string, NameplateField[]> = {
  POWER_TRANSFORMER: [
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'serial_number', label: 'Serial Number' },
    { key: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number' },
    { key: 'rating_mva', label: 'Rating', unit: 'MVA', type: 'number' },
    { key: 'rated_frequency', label: 'Rated Frequency', unit: 'Hz', type: 'number' },
    { key: 'cooling_type', label: 'Cooling Type' },
    { key: 'vector_group', label: 'Vector Group' },
    { key: 'voltage_hv', label: 'HV Voltage', unit: 'kV', type: 'number' },
    { key: 'voltage_lv', label: 'LV Voltage', unit: 'kV', type: 'number' },
    { key: 'voltage_tv', label: 'TV Voltage (3-winding)', unit: 'kV', type: 'number' },
    { key: 'rated_current_hv', label: 'Rated Current HV', unit: 'A', type: 'number' },
    { key: 'rated_current_lv', label: 'Rated Current LV', unit: 'A', type: 'number' },
    { key: 'impedance_percent', label: 'Impedance', unit: '%', type: 'number' },
    { key: 'tap_range', label: 'Tap Range' },
  ],
  CT: [
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'serial_number', label: 'Serial Number' },
    { key: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number' },
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV', type: 'number' },
    { key: 'rated_current_primary', label: 'Primary Current', unit: 'A', type: 'number' },
    { key: 'rated_current_secondary', label: 'Secondary Current', unit: 'A', type: 'number' },
    { key: 'accuracy_class', label: 'Accuracy Class' },
    { key: 'burden_va', label: 'Burden', unit: 'VA', type: 'number' },
    { key: 'short_time_current', label: 'Short Time Current', unit: 'kA', type: 'number' },
    { key: 'num_cores', label: 'Number of Cores', type: 'number' },
  ],
  CVT: [
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'serial_number', label: 'Serial Number' },
    { key: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number' },
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV', type: 'number' },
    { key: 'rated_burden_va', label: 'Rated Burden', unit: 'VA', type: 'number' },
    { key: 'accuracy_class', label: 'Accuracy Class' },
    { key: 'rated_frequency', label: 'Rated Frequency', unit: 'Hz', type: 'number' },
    { key: 'capacitance_c1', label: 'Capacitance C1', unit: 'pF', type: 'number' },
    { key: 'capacitance_c2', label: 'Capacitance C2', unit: 'pF', type: 'number' },
    { key: 'secondary_voltage', label: 'Secondary Voltage', unit: 'V', type: 'number' },
  ],
  LA: [
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'serial_number', label: 'Serial Number' },
    { key: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number' },
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV', type: 'number' },
    { key: 'mcov_kv', label: 'MCOV', unit: 'kV', type: 'number' },
    { key: 'discharge_current', label: 'Discharge Current', unit: 'kA', type: 'number' },
    { key: 'energy_class', label: 'Energy Class' },
    { key: 'protection_level', label: 'Protection Level', unit: 'kV (peak)', type: 'number' },
  ],
  SF6_BREAKER: [
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'serial_number', label: 'Serial Number' },
    { key: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number' },
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV', type: 'number' },
    { key: 'rated_current', label: 'Rated Current', unit: 'A', type: 'number' },
    { key: 'rated_sc_current', label: 'Rated SC Current', unit: 'kA', type: 'number' },
    { key: 'operating_mechanism', label: 'Operating Mechanism' },
    { key: 'sf6_pressure', label: 'SF6 Rated Pressure', unit: 'bar', type: 'number' },
    { key: 'num_breaks_per_pole', label: 'Breaks per Pole', type: 'number' },
    { key: 'control_voltage', label: 'Control Voltage', unit: 'V DC', type: 'number' },
  ],
  ISOLATOR: [
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'serial_number', label: 'Serial Number' },
    { key: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number' },
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV', type: 'number' },
    { key: 'rated_current', label: 'Rated Current', unit: 'A', type: 'number' },
    { key: 'rated_sc_current', label: 'Rated SC Current', unit: 'kA', type: 'number' },
    { key: 'isolator_type', label: 'Type (e.g. Centre-break, Double-break)' },
    { key: 'earthing_switch', label: 'Earthing Switch (Yes / No)' },
  ],
  VCB: [
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'serial_number', label: 'Serial Number' },
    { key: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number' },
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV', type: 'number' },
    { key: 'rated_current', label: 'Rated Current', unit: 'A', type: 'number' },
    { key: 'rated_sc_current', label: 'Rated SC Current', unit: 'kA', type: 'number' },
    { key: 'operating_mechanism', label: 'Operating Mechanism' },
    { key: 'control_voltage', label: 'Control Voltage', unit: 'V DC', type: 'number' },
  ],
  EARTH_PIT: [
    { key: 'location', label: 'Location / Tag', span: 'full' },
    { key: 'depth_m', label: 'Depth', unit: 'm', type: 'number' },
    { key: 'electrode_material', label: 'Electrode Material' },
    { key: 'soil_type', label: 'Soil Type' },
    { key: 'chemical_treatment', label: 'Chemical Treatment (Yes / No)' },
  ],
  VT: [
    { key: 'equipment_location', label: 'Equipment Location / Bay', span: 'full' },
    { key: 'phase', label: 'Phase (R / Y / B)' },
    { key: 'rated_primary_voltage', label: 'Rated Primary Voltage' },
    { key: 'rated_frequency', label: 'Rated Frequency', unit: 'Hz', type: 'number' },
  ],
};

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

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<TestTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('nameplate');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [nameplateData, setNameplateData] = useState<Record<string, Record<string, any>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savingNameplate, setSavingNameplate] = useState(false);
  const [submittingAll, setSubmittingAll] = useState(false);

  useEffect(() => {
    if (!user || !projectId) return;
    fetchData();
  }, [user, projectId]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = async () => {
    if (!user || !projectId) return;
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, project_number, site_name, status')
        .eq('id', projectId)
        .single();
      setProject(projectData);

      const { data: instances, error: instanceError } = await supabase
        .from('equipment_instances')
        .select('id, label, equipment_type, assigned_to, nameplate')
        .eq('project_id', projectId)
        .eq('assigned_to', user.id);

      if (instanceError) throw instanceError;
      if (!instances?.length) { setLoading(false); return; }

      const instanceIds = instances.map(i => i.id);

      const { data: taskData, error } = await supabase
        .from('test_tasks')
        .select(`
          id, status, rework_reason,
          equipment_instance:equipment_instances(id, label, equipment_type, assigned_to, nameplate),
          test_template:test_templates(id, test_name, test_code, fields)
        `)
        .in('equipment_instance_id', instanceIds)
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

      setTasks(enriched);

      // Pre-fill nameplate data per instance
      const np: Record<string, Record<string, any>> = {};
      instances.forEach(inst => {
        np[inst.id] = (inst.nameplate as Record<string, any>) || {};
      });
      setNameplateData(np);

      // Pre-fill test form data from existing records / localStorage drafts
      const prefilled: Record<string, Record<string, any>> = {};
      enriched.forEach(t => {
        if (t.existing_record) {
          prefilled[t.id] = {
            ...t.existing_record.payload,
            _remarks: t.existing_record.remarks || '',
            _pass_fail: t.existing_record.pass_fail || '',
            _instrument_id: t.existing_record.instrument_id || '',
          };
        } else {
          try {
            const raw = localStorage.getItem(`testflow_draft_${t.id}`);
            if (raw) prefilled[t.id] = JSON.parse(raw);
          } catch { /* corrupted draft */ }
        }
      });
      setFormData(prefilled);

      // Default selected instance to first one
      if (!selectedInstanceId && instances.length > 0) {
        setSelectedInstanceId(instances[0].id);
      }
    } catch (error: any) {
      toast({ title: 'Error loading tasks', description: error?.message ?? 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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

  const nameplateFields: NameplateField[] = selectedInstance
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

  const deriveEquipmentStatus = (nextTasks: TestTask[]) => {
    const statuses = nextTasks.map(t => t.status);
    if (statuses.length > 0 && statuses.every(s => s === 'APPROVED')) return 'APPROVED';
    if (statuses.includes('REWORK')) return 'REWORK';
    if (statuses.includes('SUBMITTED')) return 'SUBMITTED';
    if (statuses.some(s => s === 'IN_PROGRESS' || s === 'APPROVED')) return 'IN_PROGRESS';
    return nextTasks[0]?.equipment_instance?.assigned_to ? 'ASSIGNED' : 'UNASSIGNED';
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
        nextTasks.filter(t => t.equipment_instance?.id === task.equipment_instance?.id)
      );
      await supabase.from('equipment_instances')
        .update({ status: nextEquipmentStatus })
        .eq('id', task.equipment_instance.id);

      clearDraft(task.id);
      toast({ title: submit ? 'Test submitted for review' : 'Readings saved' });
      await fetchData();
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
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                    <Label className="whitespace-nowrap font-medium">Select Equipment Unit</Label>
                    <Select value={selectedInstanceId} onValueChange={id => { setSelectedInstanceId(id); setExpandedTask(null); }}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select equipment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {instances.map(inst => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedInstance && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                        {selectedInstance.equipment_type.replace(/_/g, ' ')}
                      </span>
                      <span>·</span>
                      <span>Total: {instances.length} unit{instances.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
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
                    TAB 2 — Testing Parameters
                ══════════════════════════════════════════════════════════ */}
                {activeTab === 'testing' && (
                  <div className="space-y-3">
                    {instanceTasks.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                          No tests assigned for this equipment unit.
                        </CardContent>
                      </Card>
                    ) : (
                      instanceTasks.map(task => {
                        const isExpanded = expandedTask === task.id;
                        const rawFields = task.test_template?.fields;
                        let parsedFields: any = null;
                        try { parsedFields = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields; } catch { /* invalid JSON — leave null */ }
                        const isV2 = parsedFields?.version === 2;
                        const v2Sections = isV2 ? (parsedFields?.sections ?? []) : [];
                        const fields = (!isV2 && parsedFields?.properties) || {};
                        const isReadonly = task.status === 'SUBMITTED' || task.status === 'APPROVED';

                        return (
                          <Card key={task.id}>
                            <CardHeader
                              className="cursor-pointer py-3"
                              onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-sm font-semibold">
                                    {task.test_template?.test_name}
                                  </CardTitle>
                                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                    {task.test_template?.test_code}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <StatusBadge status={task.status} />
                                  {!task.existing_record && formData[task.id] && Object.keys(formData[task.id]).length > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <HardDrive className="h-3 w-3" /> Draft
                                    </span>
                                  )}
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                              </div>
                            </CardHeader>

                            {isExpanded && (
                              <CardContent className="space-y-4 border-t pt-4">
                                {task.status === 'REWORK' && task.rework_reason && (
                                  <div className="rounded border border-orange-200 bg-orange-50 p-3">
                                    <p className="text-xs font-semibold text-orange-700 uppercase mb-1">Rework Required</p>
                                    <p className="text-sm text-orange-900">{task.rework_reason}</p>
                                  </div>
                                )}

                                {/* Dynamic test form */}
                                {isV2 ? (
                                  <TestFormV2
                                    taskId={task.id}
                                    sections={v2Sections}
                                    formData={formData[task.id] || {}}
                                    onChange={(key, value) => handleFieldChange(task.id, key, value)}
                                    isReadonly={isReadonly}
                                  />
                                ) : Object.keys(fields).length > 0 ? (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Measurement Readings</p>
                                    <div className="grid grid-cols-2 gap-4">
                                      {Object.entries(fields).map(([key, schema]: [string, any]) =>
                                        renderLegacyField(task.id, key, schema)
                                      )}
                                    </div>
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

                                {/* Common fields */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                  <div className="space-y-1">
                                    <Label>Instrument ID</Label>
                                    <InstrumentSelector
                                      value={formData[task.id]?._instrument_id || ''}
                                      onChange={v => handleFieldChange(task.id, '_instrument_id', v)}
                                      disabled={isReadonly}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Pass / Fail</Label>
                                    <Select
                                      value={formData[task.id]?._pass_fail || ''}
                                      onValueChange={v => handleFieldChange(task.id, '_pass_fail', v)}
                                      disabled={isReadonly}
                                    >
                                      <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="PASS">Pass</SelectItem>
                                        <SelectItem value="FAIL">Fail</SelectItem>
                                        <SelectItem value="MARGINAL">Marginal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label>Remarks</Label>
                                  <Textarea
                                    value={formData[task.id]?._remarks || ''}
                                    onChange={e => handleFieldChange(task.id, '_remarks', e.target.value)}
                                    placeholder="Any observations or notes..."
                                    disabled={isReadonly}
                                  />
                                </div>

                                {isReadonly ? (
                                  <p className="text-sm text-muted-foreground">
                                    This test has been {task.status.toLowerCase()} and cannot be edited.
                                  </p>
                                ) : (
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => handleSaveTask(task, false)} disabled={saving === task.id}>
                                      {saving === task.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                      <Save className="h-4 w-4 mr-2" />
                                      Save Draft
                                    </Button>
                                    <Button onClick={() => handleSaveTask(task, true)} disabled={saving === task.id}>
                                      {saving === task.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                      Submit for Review
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            )}
                          </Card>
                        );
                      })
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
