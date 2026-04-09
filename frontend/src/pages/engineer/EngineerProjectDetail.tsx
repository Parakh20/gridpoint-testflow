import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, Save, HardDrive } from 'lucide-react';
import { InstrumentSelector } from '@/components/InstrumentSelector';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TestTask {
  id: string;
  status: string;
  rework_reason: string | null;
  equipment_instance: { id: string; label: string; equipment_type: string; assigned_to: string | null } | null;
  test_template: { id: string; test_name: string; test_code: string; fields: any } | null;
  existing_record?: any;
}

export default function EngineerProjectDetail() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<TestTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !projectId) return;
    fetchData();
  }, [user, projectId]);

  const fetchData = async () => {
    if (!user || !projectId) return;
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, project_number, site_name, status')
        .eq('id', projectId)
        .single();
      setProject(projectData);

      // Get instances assigned to this engineer in this project
      const { data: instances } = await supabase
        .from('equipment_instances')
        .select('id')
        .eq('project_id', projectId)
        .eq('assigned_to', user.id);

      if (!instances?.length) { setLoading(false); return; }

      const instanceIds = instances.map(i => i.id);

      const { data: taskData, error } = await supabase
        .from('test_tasks')
        .select(`
          id, status, rework_reason,
          equipment_instance:equipment_instances(id, label, equipment_type, assigned_to),
          test_template:test_templates(id, test_name, test_code, fields)
        `)
        .in('equipment_instance_id', instanceIds)
        .order('created_at');

      if (error) throw error;

      // Fetch existing records
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

      // Pre-fill form data from existing records; fall back to localStorage draft
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
          // Restore unsaved draft from localStorage
          try {
            const raw = localStorage.getItem(`testflow_draft_${t.id}`);
            if (raw) prefilled[t.id] = JSON.parse(raw);
          } catch { /* corrupted draft — ignore */ }
        }
      });
      setFormData(prefilled);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const draftKey = (taskId: string) => `testflow_draft_${taskId}`;

  const handleFieldChange = (taskId: string, field: string, value: any) => {
    setFormData(prev => {
      const next = {
        ...prev,
        [taskId]: { ...(prev[taskId] || {}), [field]: value },
      };
      // Persist draft to localStorage
      try {
        localStorage.setItem(draftKey(taskId), JSON.stringify(next[taskId]));
      } catch { /* quota exceeded — ignore */ }
      return next;
    });
  };

  const clearDraft = (taskId: string) => {
    try { localStorage.removeItem(draftKey(taskId)); } catch { /* ignore */ }
  };

  const deriveEquipmentStatus = (nextTasks: TestTask[]) => {
    const statuses = nextTasks.map(task => task.status);

    if (statuses.length > 0 && statuses.every(status => status === 'APPROVED')) {
      return 'APPROVED';
    }

    if (statuses.includes('REWORK')) {
      return 'REWORK';
    }

    if (statuses.includes('SUBMITTED')) {
      return 'SUBMITTED';
    }

    if (statuses.some(status => status === 'IN_PROGRESS' || status === 'APPROVED')) {
      return 'IN_PROGRESS';
    }

    return nextTasks[0]?.equipment_instance?.assigned_to ? 'ASSIGNED' : 'UNASSIGNED';
  };

  const handleSave = async (task: TestTask, submit = false) => {
    if (!user || !task.equipment_instance?.id) return;
    setSaving(task.id);
    try {
      const data = formData[task.id] || {};
      const { _remarks, _pass_fail, _instrument_id, ...payload } = data;

      const record = {
        test_task_id: task.id,
        payload,
        remarks: _remarks || null,
        pass_fail: _pass_fail || null,
        instrument_id: _instrument_id || null,
        created_by: user.id,
      };

      const { error: recordError } = await supabase
        .from('test_records')
        .upsert(record, { onConflict: 'test_task_id' });

      if (recordError) throw recordError;

      const nextTaskStatus = submit ? 'SUBMITTED' : 'IN_PROGRESS';
      const taskUpdate = submit
        ? {
            status: 'SUBMITTED',
            submitted_at: new Date().toISOString(),
            approved_at: null,
          }
        : {
            status: 'IN_PROGRESS',
            submitted_at: null,
            approved_at: null,
          };

      const { error: taskError } = await supabase
        .from('test_tasks')
        .update(taskUpdate)
        .eq('id', task.id);

      if (taskError) throw taskError;

      const nextTasks = tasks.map(currentTask =>
        currentTask.id === task.id
          ? { ...currentTask, status: nextTaskStatus }
          : currentTask
      );

      const instanceTasks = nextTasks.filter(
        currentTask => currentTask.equipment_instance?.id === task.equipment_instance?.id
      );
      const nextEquipmentStatus = deriveEquipmentStatus(instanceTasks);

      const { error: equipmentError } = await supabase
        .from('equipment_instances')
        .update({ status: nextEquipmentStatus })
        .eq('id', task.equipment_instance.id);

      if (equipmentError) throw equipmentError;

      clearDraft(task.id);
      setTasks(nextTasks);
      if (submit) {
        toast({ title: 'Test submitted for review' });
      } else {
        toast({ title: 'Readings saved' });
      }

      await fetchData();
    } catch (error: any) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const renderField = (taskId: string, fieldKey: string, fieldSchema: any) => {
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

  if (loading) {
    return (
      <DashboardLayout title="Project Tasks">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Project Tasks">
      <div className="space-y-6">
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

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No test tasks assigned for this project.
              </CardContent>
            </Card>
          ) : (
            tasks.map(task => {
              const isExpanded = expandedTask === task.id;
              const rawFields = task.test_template?.fields;
              let parsedFields: any = null;
              try {
                parsedFields = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields;
              } catch { parsedFields = null; }
              const fields = parsedFields?.properties || {};
              const isReadonly = task.status === 'SUBMITTED' || task.status === 'APPROVED';

              return (
                <Card key={task.id}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {task.equipment_instance?.label} — {task.test_template?.test_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {task.test_template?.test_code} · {task.equipment_instance?.equipment_type.replace(/_/g, ' ')}
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
                      {/* Rework reason banner */}
                      {task.status === 'REWORK' && task.rework_reason && (
                        <div className="rounded border border-orange-200 bg-orange-50 p-3">
                          <p className="text-xs font-semibold text-orange-700 uppercase mb-1">Rework Required</p>
                          <p className="text-sm text-orange-900">{task.rework_reason}</p>
                        </div>
                      )}
                      {/* Dynamic fields from template */}
                      {Object.keys(fields).length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Measurement Readings</p>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(fields).map(([key, schema]: [string, any]) =>
                              renderField(task.id, key, schema)
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Measurement Reading</p>
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
                          <Button
                            variant="outline"
                            onClick={() => handleSave(task, false)}
                            disabled={saving === task.id}
                          >
                            {saving === task.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Save className="h-4 w-4 mr-2" />
                            Save Draft
                          </Button>
                          <Button
                            onClick={() => handleSave(task, true)}
                            disabled={saving === task.id}
                          >
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
      </div>
    </DashboardLayout>
  );
}
