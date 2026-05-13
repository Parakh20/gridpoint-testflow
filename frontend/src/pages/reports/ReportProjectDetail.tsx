import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, FileSpreadsheet, Loader2, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { exportReportExcel, type ReportExportGroup } from '@/lib/reportsExcelExport';
import { PDFDownloadButton } from '@/components/pdf/PDFDownloadButton';
import type { ProjectReportPDFProps, PDFEquipmentGroup, PDFTaskItem } from '@/components/pdf/ProjectReportPDF';
import { TEMPLATE_FALLBACKS } from '@/lib/templateFallbacks';
import { isV2Schema, SectionTable } from '@/lib/testSectionTables';

const ENGINEER_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#f43f5e',
  '#06b6d4', '#f59e0b', '#ec4899', '#84cc16', '#14b8a6',
];

interface ReportTask {
  id: string;
  status: string;
  rework_reason: string | null;
  assigned_to: string | null;
  equipment_instance: { id: string; label: string; equipment_type: string; nameplate: Record<string, any> } | null;
  test_template: { test_name: string; test_code: string; fields: any } | null;
  record: {
    payload: Record<string, any>;
    instrument_id: string | null;
    pass_fail: string | null;
    remarks: string | null;
  } | null;
}

function PassFailBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  if (value === 'PASS') return (
    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
      <CheckCircle2 className="h-3 w-3 mr-1" />Pass
    </Badge>
  );
  if (value === 'FAIL') return (
    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
      <XCircle className="h-3 w-3 mr-1" />Fail
    </Badge>
  );
  return (
    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
      <AlertCircle className="h-3 w-3 mr-1" />Marginal
    </Badge>
  );
}

export default function ReportProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [manager, setManager] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ReportTask[]>([]);
  const [engineers, setEngineers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [reworkDialogTask, setReworkDialogTask] = useState<ReportTask | null>(null);
  const [reworkReason, setReworkReason] = useState('');
  const [submittingRework, setSubmittingRework] = useState(false);
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const canReview = userRole === 'SUPERVISOR' || userRole === 'GM' || userRole === 'SUPERADMIN';

  const engineerColors = useMemo(() => {
    const sorted = [...engineers.keys()].sort();
    const map = new Map<string, string>();
    sorted.forEach((id, i) => map.set(id, ENGINEER_COLORS[i % ENGINEER_COLORS.length]));
    return map;
  }, [engineers]);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        const { data: proj, error: projErr } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
        if (projErr) throw projErr;
        setProject(proj);

        if (proj.assigned_to) {
          const { data: mgr } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', proj.assigned_to)
            .single();
          setManager(mgr?.name ?? null);
        }

        const { data: instances, error: instErr } = await supabase
          .from('equipment_instances')
          .select('id')
          .eq('project_id', projectId);
        if (instErr) throw instErr;
        if (!instances?.length) { setLoading(false); return; }

        const instanceIds = instances.map(i => i.id);

        const { data: taskData, error: taskErr } = await supabase
          .from('test_tasks')
          .select(`
            id, status, rework_reason, assigned_to,
            equipment_instance:equipment_instances(id, label, equipment_type, nameplate),
            test_template:test_templates(test_name, test_code, fields)
          `)
          .in('equipment_instance_id', instanceIds)
          .order('created_at');
        if (taskErr) throw taskErr;

        const taskIds = (taskData || []).map(t => t.id);
        const { data: records } = await supabase
          .from('test_records')
          .select('test_task_id, payload, instrument_id, pass_fail, remarks')
          .in('test_task_id', taskIds);

        const recordMap = Object.fromEntries((records || []).map(r => [r.test_task_id, r]));
        const enriched: ReportTask[] = (taskData || []).map(t => ({
          ...t,
          record: recordMap[t.id]
            ? { ...recordMap[t.id], payload: (recordMap[t.id].payload as Record<string, any>) || {} }
            : null,
        }));
        setTasks(enriched);

        const engineerIds = [...new Set(enriched.map(t => t.assigned_to).filter(Boolean) as string[])];
        if (engineerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', engineerIds);
          const engMap = new Map<string, string>();
          (profiles || []).forEach(p => engMap.set(p.id, p.name ?? p.email ?? 'Unknown'));
          setEngineers(engMap);
        }
      } catch (err) {
        console.error('Error fetching report data:', err);
        toast({ title: 'Failed to load report', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [projectId]);

  const progressStats = useMemo(() => {
    if (!tasks.length) return null;
    return {
      total: tasks.length,
      approved: tasks.filter(t => t.status === 'APPROVED').length,
      submitted: tasks.filter(t => t.status === 'SUBMITTED').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      draft: tasks.filter(t => t.status === 'DRAFT').length,
    };
  }, [tasks]);

  const tasksByEquipment = useMemo(() => {
    const grouped = new Map<string, { label: string; equipmentType: string; nameplate: Record<string, any>; tasks: ReportTask[] }>();
    tasks.forEach(t => {
      if (!t.equipment_instance) return;
      const key = t.equipment_instance.id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          label: t.equipment_instance.label,
          equipmentType: t.equipment_instance.equipment_type,
          nameplate: (t.equipment_instance.nameplate as Record<string, any>) ?? {},
          tasks: [],
        });
      }
      grouped.get(key)!.tasks.push(t);
    });
    return grouped;
  }, [tasks]);

  // Auto-expand first equipment when data loads
  useEffect(() => {
    const first = tasksByEquipment.keys().next().value;
    if (first) setExpandedEquipment(new Set([first]));
  }, [tasksByEquipment.size]);

  const toggleEquipment = useCallback((id: string) => {
    setExpandedEquipment(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleTask = useCallback((id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const pdfProps = useMemo((): ProjectReportPDFProps | null => {
    if (!project || !progressStats) return null;
    const equipmentGroups: PDFEquipmentGroup[] = [];
    tasksByEquipment.forEach(({ label, equipmentType, nameplate, tasks: eqpTasks }, instanceId) => {
      const pdfTasks: PDFTaskItem[] = eqpTasks.map(t => {
        const rawFields = t.test_template?.fields;
        const testCode = t.test_template?.test_code ?? '';
        const schema = isV2Schema(rawFields) ? rawFields : (TEMPLATE_FALLBACKS[testCode] ?? null);
        const engName = t.assigned_to ? (engineers.get(t.assigned_to) ?? 'Unknown') : 'Unassigned';
        const engColor = t.assigned_to ? (engineerColors.get(t.assigned_to) ?? '#6b7280') : '#4b5563';
        return {
          id: t.id,
          status: t.status,
          testName: t.test_template?.test_name ?? '',
          testCode,
          schema,
          payload: t.record?.payload ?? {},
          instrumentId: t.record?.instrument_id ?? null,
          passFail: t.record?.pass_fail ?? null,
          remarks: t.record?.remarks ?? null,
          assignedEngineerName: engName,
          assignedEngineerColor: engColor,
        };
      });
      equipmentGroups.push({ id: instanceId, label, equipmentType, nameplate, tasks: pdfTasks });
    });
    return {
      projectNumber: project.project_number,
      siteName: project.site_name,
      siteAddress: project.site_address ?? null,
      client: project.client ?? null,
      status: project.status,
      startDate: project.start_date ? formatDate(project.start_date) : null,
      createdAt: formatDate(project.created_at),
      managerName: manager,
      progressStats,
      equipmentGroups,
      generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  }, [project, progressStats, tasksByEquipment, engineers, engineerColors, manager]);

  const handleTaskReview = async (task: ReportTask, nextStatus: 'APPROVED' | 'REWORK', reason?: string) => {
    setReviewingTaskId(task.id);
    try {
      const update =
        nextStatus === 'APPROVED'
          ? { status: 'APPROVED', approved_at: new Date().toISOString(), rework_reason: null }
          : { status: 'REWORK', approved_at: null, rework_reason: reason ?? null };

      const { error } = await supabase.from('test_tasks').update(update).eq('id', task.id);
      if (error) throw error;

      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: nextStatus, rework_reason: reason ?? null } : t
      ));
      toast({ title: nextStatus === 'APPROVED' ? 'Test approved' : 'Sent back for rework' });
    } catch (err: any) {
      toast({ title: 'Review failed', description: err?.message, variant: 'destructive' });
    } finally {
      setReviewingTaskId(null);
    }
  };

  const handleReworkConfirm = async () => {
    if (!reworkDialogTask) return;
    setSubmittingRework(true);
    await handleTaskReview(reworkDialogTask, 'REWORK', reworkReason.trim() || undefined);
    setSubmittingRework(false);
    setReworkDialogTask(null);
    setReworkReason('');
  };

  const handleExportExcel = () => {
    if (!project || !tasksByEquipment.size) return;
    setExportingExcel(true);
    try {
      const groups: ReportExportGroup[] = [];
      tasksByEquipment.forEach(({ label, equipmentType, tasks: eqpTasks }) => {
        groups.push({
          label,
          equipmentType,
          tasks: eqpTasks.map(t => ({
            testName: t.test_template?.test_name ?? '',
            testCode: t.test_template?.test_code ?? '',
            instrumentId: t.record?.instrument_id ?? null,
            passFail: t.record?.pass_fail ?? null,
            status: t.status,
            assignedEngineerName: t.assigned_to ? (engineers.get(t.assigned_to) ?? 'Unknown') : 'Unassigned',
            remarks: t.record?.remarks ?? null,
          })),
        });
      });
      exportReportExcel(project.project_number, project.site_name, groups);
    } finally {
      setExportingExcel(false);
    }
  };


  if (loading) {
    return (
      <DashboardLayout title="Reports">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout title="Reports">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
          <Button onClick={() => navigate('/reports')} className="mt-4">Back to Reports</Button>
        </div>
      </DashboardLayout>
    );
  }

  const approvedPct = progressStats && progressStats.total > 0
    ? Math.round((progressStats.approved / progressStats.total) * 100)
    : 0;

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        {/* Page header (outside report ref — not in PDF) */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Reports
            </Button>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-2xl font-bold">{project.project_number}</h2>
              <StatusBadge status={project.status} />
              {manager && (
                <span className="text-sm text-muted-foreground">
                  Manager: <span className="font-medium text-foreground">{manager}</span>
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{project.site_name}</p>
          </div>
          <div className="flex gap-2 shrink-0 pt-8">
            <Button variant="outline" disabled={exportingExcel || !tasksByEquipment.size} onClick={handleExportExcel}>
              {exportingExcel
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              {exportingExcel ? 'Exporting…' : 'Export Excel'}
            </Button>
            {pdfProps && (
              <PDFDownloadButton
                pdfProps={pdfProps}
                fileName={`${project.project_number}_Report.pdf`}
              />
            )}
          </div>
        </div>

        <div className="space-y-6">

          {/* Project details */}
          <Card>
            <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Project Number</p>
                  <p className="mt-0.5">{project.project_number}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Status</p>
                  <div className="mt-0.5"><StatusBadge status={project.status} /></div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Site Name</p>
                  <p className="mt-0.5">{project.site_name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Client</p>
                  <p className="mt-0.5">{project.client || '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Site Address</p>
                  <p className="mt-0.5">{project.site_address || '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Manager</p>
                  <p className="mt-0.5">{manager ?? '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Start Date</p>
                  <p className="mt-0.5">{formatDate(project.start_date)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Created</p>
                  <p className="mt-0.5">{formatDate(project.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress summary */}
          {progressStats && (
            <Card>
              <CardHeader><CardTitle>Progress Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tests Approved</span>
                  <span className="font-semibold tabular-nums">
                    {progressStats.approved} / {progressStats.total} ({approvedPct}%)
                  </span>
                </div>
                <Progress value={approvedPct} />
                <div className="flex flex-wrap gap-5 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">{progressStats.submitted} pending review</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">{progressStats.inProgress} in progress</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" />
                    <span className="text-muted-foreground">{progressStats.draft} not started</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Equipment sections — collapsible */}
          {tasksByEquipment.size === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No test data available for this project.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {Array.from(tasksByEquipment.entries()).map(([instanceId, { label, equipmentType, tasks: eqpTasks }]) => {
                const approvedInGroup = eqpTasks.filter(t => t.status === 'APPROVED').length;
                const isOpen = expandedEquipment.has(instanceId);
                const submittedCount = eqpTasks.filter(t => t.status === 'SUBMITTED').length;
                return (
                  <Card key={instanceId} className="overflow-hidden">
                    {/* Accordion trigger */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                      onClick={() => toggleEquipment(instanceId)}
                    >
                      <span className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="font-mono font-semibold text-sm">{label}</span>
                      <span className="text-sm text-muted-foreground">— {equipmentType.replace(/_/g, ' ')}</span>
                      <span className="ml-auto flex items-center gap-3 shrink-0">
                        {submittedCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded px-2 py-0.5">
                            {submittedCount} pending review
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {approvedInGroup}/{eqpTasks.length} approved
                        </span>
                      </span>
                    </button>

                    {/* Collapsible content */}
                    {isOpen && (
                      <div className="border-t border-border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Test Name</TableHead>
                              <TableHead>Code</TableHead>
                              <TableHead>Instrument ID</TableHead>
                              <TableHead>Result</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Assigned Engineer</TableHead>
                              {canReview && <TableHead className="w-[200px]">Review</TableHead>}
                              <TableHead>Remarks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {eqpTasks.map(task => {
                              const engName = task.assigned_to ? (engineers.get(task.assigned_to) ?? 'Unknown') : null;
                              const engColor = task.assigned_to
                                ? (engineerColors.get(task.assigned_to) ?? '#6b7280')
                                : '#4b5563';
                              const isTaskOpen = expandedTasks.has(task.id);
                              const rawFields = task.test_template?.fields;
                              const testCode = task.test_template?.test_code ?? '';
                              const schema = isV2Schema(rawFields) ? rawFields : (TEMPLATE_FALLBACKS[testCode] ?? null);
                              const hasParams = !!schema && !!task.record;
                              const colSpan = canReview ? 8 : 7;
                              return (
                                <React.Fragment key={task.id}>
                                  <TableRow
                                    className={hasParams ? 'cursor-pointer hover:bg-muted/40' : ''}
                                    onClick={hasParams ? () => toggleTask(task.id) : undefined}
                                  >
                                    <TableCell className="font-medium text-sm">
                                      <div className="flex items-center gap-1.5">
                                        {hasParams && (
                                          <ChevronRight className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform duration-150 ${isTaskOpen ? 'rotate-90' : ''}`} />
                                        )}
                                        {task.test_template?.test_name}
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                      {task.test_template?.test_code}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {task.record?.instrument_id || <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>
                                      <PassFailBadge value={task.record?.pass_fail ?? null} />
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-0.5">
                                        <StatusBadge status={task.status} />
                                        {task.rework_reason && (
                                          <p className="text-[10px] text-orange-400 leading-tight max-w-[160px] truncate">
                                            {task.rework_reason}
                                          </p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {engName ? (
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: engColor }} />
                                          <span className="text-sm">{engName}</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">Unassigned</span>
                                      )}
                                    </TableCell>
                                    {canReview && (
                                      <TableCell onClick={e => e.stopPropagation()}>
                                        {task.status === 'SUBMITTED' ? (
                                          <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" disabled={reviewingTaskId === task.id}
                                              onClick={() => { setReworkDialogTask(task); setReworkReason(''); }}>
                                              {reviewingTaskId === task.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                              Rework
                                            </Button>
                                            <Button size="sm" disabled={reviewingTaskId === task.id}
                                              onClick={() => handleTaskReview(task, 'APPROVED')}>
                                              {reviewingTaskId === task.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                              Approve
                                            </Button>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                      </TableCell>
                                    )}
                                    <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                      <span className="line-clamp-2">{task.record?.remarks || '—'}</span>
                                    </TableCell>
                                  </TableRow>

                                  {/* Expanded parameter data */}
                                  {isTaskOpen && schema && task.record && (
                                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                                      <TableCell colSpan={colSpan} className="py-4 px-6">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                          Testing Parameters — {task.test_template?.test_name}
                                        </div>
                                        {schema.sections.map(section => (
                                          <SectionTable
                                            key={section.id}
                                            section={section}
                                            payload={task.record!.payload}
                                          />
                                        ))}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Rework dialog */}
      <Dialog
        open={!!reworkDialogTask}
        onOpenChange={open => { if (!open) { setReworkDialogTask(null); setReworkReason(''); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back for Rework</DialogTitle>
            <DialogDescription>Provide a reason so the engineer knows what to correct.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rework-reason">Rework Reason</Label>
            <Textarea
              id="rework-reason"
              placeholder="Describe what needs to be corrected..."
              value={reworkReason}
              onChange={e => setReworkReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReworkDialogTask(null); setReworkReason(''); }}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={submittingRework} onClick={handleReworkConfirm}>
              {submittingRework && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send for Rework
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
