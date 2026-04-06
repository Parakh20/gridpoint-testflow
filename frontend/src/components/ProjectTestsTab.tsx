import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TestTask {
  id: string;
  status: string;
  equipment_instance: { id: string; label: string; equipment_type: string; assigned_to: string | null } | null;
  test_template: { test_name: string; test_code: string; fields: any } | null;
  record: {
    id: string;
    payload: Record<string, any>;
    instrument_id: string | null;
    pass_fail: string | null;
    remarks: string | null;
  } | null;
}

interface ProjectTestsTabProps {
  projectId: string;
}

export function ProjectTestsTab({ projectId }: ProjectTestsTabProps) {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [testTasks, setTestTasks] = useState<TestTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);

  const canReviewTests =
    userRole === 'SUPERVISOR' ||
    userRole === 'GM' ||
    userRole === 'SUPERADMIN';

  useEffect(() => {
    fetchTestTasks();
  }, [projectId]);

  const fetchTestTasks = async () => {
    try {
      const { data: instances, error: instError } = await supabase
        .from('equipment_instances')
        .select('id')
        .eq('project_id', projectId);

      if (instError) throw instError;
      if (!instances?.length) { setLoading(false); return; }

      const instanceIds = instances.map(i => i.id);

      const { data, error } = await supabase
        .from('test_tasks')
        .select(`
          id, status,
          equipment_instance:equipment_instances(id, label, equipment_type, assigned_to),
          test_template:test_templates(test_name, test_code, fields)
        `)
        .in('equipment_instance_id', instanceIds)
        .order('created_at');

      if (error) throw error;

      // Fetch test records for all tasks
      const taskIds = (data || []).map(t => t.id);
      const { data: records } = await supabase
        .from('test_records')
        .select('id, test_task_id, payload, instrument_id, pass_fail, remarks')
        .in('test_task_id', taskIds);

      const recordMap = Object.fromEntries((records || []).map(r => [r.test_task_id, r]));

      const enriched = (data || []).map(t => ({
        ...t,
        record: recordMap[t.id] || null,
      })) as TestTask[];

      setTestTasks(enriched);
    } catch (error) {
      console.error('Error fetching test tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const deriveEquipmentStatus = (tasks: TestTask[]) => {
    const statuses = tasks.map(task => task.status);

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

    return tasks[0]?.equipment_instance?.assigned_to ? 'ASSIGNED' : 'UNASSIGNED';
  };

  const syncEquipmentStatus = async (nextTasks: TestTask[], equipmentInstanceId: string) => {
    const equipmentTasks = nextTasks.filter(task => task.equipment_instance?.id === equipmentInstanceId);

    if (!equipmentTasks.length) {
      return;
    }

    const nextStatus = deriveEquipmentStatus(equipmentTasks);

    const { error } = await supabase
      .from('equipment_instances')
      .update({ status: nextStatus })
      .eq('id', equipmentInstanceId);

    if (error) {
      throw error;
    }
  };

  const handleTaskReview = async (task: TestTask, nextStatus: 'APPROVED' | 'REWORK') => {
    if (!task.equipment_instance?.id) {
      return;
    }

    setReviewingTaskId(task.id);

    try {
      const update =
        nextStatus === 'APPROVED'
          ? { status: 'APPROVED', approved_at: new Date().toISOString() }
          : { status: 'REWORK', approved_at: null };

      const { error } = await supabase
        .from('test_tasks')
        .update(update)
        .eq('id', task.id);

      if (error) {
        throw error;
      }

      const nextTasks = testTasks.map(currentTask =>
        currentTask.id === task.id
          ? { ...currentTask, status: nextStatus }
          : currentTask
      );

      await syncEquipmentStatus(nextTasks, task.equipment_instance.id);

      setTestTasks(nextTasks);
      toast({
        title: nextStatus === 'APPROVED' ? 'Test approved' : 'Sent back for rework',
        description:
          nextStatus === 'APPROVED'
            ? 'The submitted test has been approved.'
            : 'The engineer can now update and resubmit this test.',
      });
    } catch (error: any) {
      console.error('Error reviewing test task:', error);
      toast({
        title: 'Review failed',
        description: error.message ?? 'Unable to update test status',
        variant: 'destructive',
      });
    } finally {
      setReviewingTaskId(null);
    }
  };

  const completedTests = testTasks.filter(t => t.status === 'APPROVED').length;
  const submittedTests = testTasks.filter(t => t.status === 'SUBMITTED').length;
  const completionPercentage = testTasks.length > 0
    ? Math.round((completedTests / testTasks.length) * 100)
    : 0;

  const PassFailBadge = ({ value }: { value: string | null }) => {
    if (!value) return <span className="text-muted-foreground text-xs">—</span>;
    if (value === 'PASS') return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Pass</Badge>;
    if (value === 'FAIL') return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Fail</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />Marginal</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (testTasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No test tasks available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card>
        <CardHeader><CardTitle>Test Progress</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Approved</span>
            <span className="font-medium">{completedTests} / {testTasks.length} ({completionPercentage}%)</span>
          </div>
          <Progress value={completionPercentage} />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{submittedTests} pending review</span>
            <span>{testTasks.filter(t => t.status === 'IN_PROGRESS').length} in progress</span>
            <span>{testTasks.filter(t => t.status === 'DRAFT').length} not started</span>
          </div>
        </CardContent>
      </Card>

      {/* Tasks grouped by equipment */}
      {Array.from(new Set(testTasks.map(t => t.equipment_instance?.label))).map(label => {
        const groupTasks = testTasks.filter(t => t.equipment_instance?.label === label);
        return (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {label}
                <span className="text-xs font-normal text-muted-foreground">
                  {groupTasks[0]?.equipment_instance?.equipment_type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  {groupTasks.filter(t => t.status === 'APPROVED').length}/{groupTasks.length} approved
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Code</TableHead>
                  <TableHead>Instrument ID</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Status</TableHead>
                  {canReviewTests && <TableHead className="w-[220px]">Review</TableHead>}
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                  {groupTasks.map(task => {
                    const rawFields = task.test_template?.fields;
                    const parsedFields = rawFields
                      ? (typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields)
                      : null;
                    const fieldDefs = parsedFields?.properties || {};
                    const payload = task.record?.payload || {};

                    return (
                      <React.Fragment key={task.id}>
                        <TableRow
                          className={task.record ? 'cursor-pointer hover:bg-muted/50' : ''}
                          onClick={() => task.record && setExpanded(expanded === task.id ? null : task.id)}
                        >
                          <TableCell className="font-medium text-sm">{task.test_template?.test_name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{task.test_template?.test_code}</TableCell>
                          <TableCell className="text-sm">{task.record?.instrument_id || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell><PassFailBadge value={task.record?.pass_fail || null} /></TableCell>
                          <TableCell><StatusBadge status={task.status} /></TableCell>
                          {canReviewTests && (
                            <TableCell onClick={e => e.stopPropagation()}>
                              {task.status === 'SUBMITTED' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={reviewingTaskId === task.id}
                                    onClick={() => handleTaskReview(task, 'REWORK')}
                                  >
                                    {reviewingTaskId === task.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Rework
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={reviewingTaskId === task.id}
                                    onClick={() => handleTaskReview(task, 'APPROVED')}
                                  >
                                    {reviewingTaskId === task.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Approve
                                  </Button>
                                </div>
                              ) : task.status === 'REWORK' ? (
                                <span className="text-xs text-muted-foreground">Waiting on engineer update</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {task.record && (
                              expanded === task.id
                                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expanded readings */}
                        {expanded === task.id && task.record && (
                          <TableRow>
                            <TableCell colSpan={canReviewTests ? 7 : 6} className="bg-muted/30 p-4">
                              <div className="space-y-3">
                                {Object.keys(payload).length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Readings</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      {Object.entries(payload).map(([key, value]) => (
                                        <div key={key} className="bg-background rounded p-2 border">
                                          <p className="text-xs text-muted-foreground">{fieldDefs[key]?.title || key}</p>
                                          <p className="text-sm font-medium">{String(value ?? '—')}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {task.record.remarks && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Remarks</p>
                                    <p className="text-sm">{task.record.remarks}</p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
