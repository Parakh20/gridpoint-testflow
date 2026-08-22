import { useState, useEffect, useRef } from 'react';
import { useRealtimeChannel, usePollingFallback } from '@/lib/realtime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MetricCard } from '@/components/MetricCard';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, AlertCircle, FolderOpen, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { ReviewQueueItem } from '@/components/ReviewQueueItem';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { sortPendingTests, rollUpInstanceStatusAfterApproval } from '@/lib/reviewQueue';
import type { Tables } from '@/integrations/supabase/types';

type Project = Tables<'projects'>;

interface PendingTest {
  id: string;
  status: string;
  equipment_instance: { id: string; label: string; equipment_type: string } | null;
  test_template: { test_name: string; test_code: string } | null;
  project_id: string;
  project_number: string;
  created_at: string;
}

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [reworkDialogTask, setReworkDialogTask] = useState<PendingTest | null>(null);
  const [reworkReason, setReworkReason] = useState('');
  const [submittingRework, setSubmittingRework] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['supervisor-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('assigned_to', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: pendingTests = [] } = useQuery({
    queryKey: ['supervisor-pending-tests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: myProjects } = await supabase
        .from('projects').select('id, project_number').eq('assigned_to', user.id);
      if (!myProjects?.length) return [];

      const projectIds = myProjects.map(p => p.id);
      const projectMap = Object.fromEntries(myProjects.map(p => [p.id, p.project_number]));

      const { data: instances } = await supabase
        .from('equipment_instances').select('id, project_id').in('project_id', projectIds);
      if (!instances?.length) return [];

      const instanceIds = instances.map(i => i.id);
      const instanceProjectMap = Object.fromEntries(instances.map(i => [i.id, i.project_id]));

      const { data: tasks, error } = await supabase
        .from('test_tasks')
        .select(`id, status, created_at, equipment_instance:equipment_instances(id, label, equipment_type), test_template:test_templates(test_name, test_code), equipment_instance_id`)
        .in('equipment_instance_id', instanceIds)
        .eq('status', 'SUBMITTED')
        .order('created_at');
      if (error) return [];

      return sortPendingTests((tasks || []).map(t => ({
        id: t.id,
        status: t.status,
        created_at: t.created_at,
        equipment_instance: t.equipment_instance,
        test_template: t.test_template,
        project_id: instanceProjectMap[t.equipment_instance_id] || '',
        project_number: projectMap[instanceProjectMap[t.equipment_instance_id]] || '',
      })) as PendingTest[]);
    },
    enabled: !!user,
  });

  const stats = {
    total:         projects.length,
    active:        projects.filter(p => p.status === 'ACTIVE').length,
    pendingStart:  projects.filter(p => p.status === 'APPROVED').length,
    pendingReview: pendingTests.length,
  };

  // Debounced realtime invalidations + polling fallback when realtime is off
  const projTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateProjectsNow = () => {
    if (user) queryClient.invalidateQueries({ queryKey: ['supervisor-projects', user.id] });
  };
  const invalidateTasksNow = () => {
    if (user) queryClient.invalidateQueries({ queryKey: ['supervisor-pending-tests', user.id] });
  };
  const invalidateProjects = () => {
    if (projTimer.current) clearTimeout(projTimer.current);
    projTimer.current = setTimeout(invalidateProjectsNow, 800);
  };
  const invalidateTasks = () => {
    if (taskTimer.current) clearTimeout(taskTimer.current);
    taskTimer.current = setTimeout(invalidateTasksNow, 1200);
  };

  useRealtimeChannel(
    `supervisor-bus-${user?.id ?? 'anon'}`,
    (channel) => {
      if (!user) return;
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects', filter: `assigned_to=eq.${user.id}` }, invalidateProjects)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `assigned_to=eq.${user.id}` }, invalidateProjects)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'test_tasks' }, invalidateTasks);
    },
    [user?.id, queryClient],
  );

  usePollingFallback(() => {
    invalidateProjectsNow();
    invalidateTasksNow();
  });

  useEffect(() => () => {
    if (projTimer.current) clearTimeout(projTimer.current);
    if (taskTimer.current) clearTimeout(taskTimer.current);
  }, []);

  const handleTaskReview = async (task: PendingTest, nextStatus: 'APPROVED' | 'REWORK', reason?: string) => {
    setReviewingTaskId(task.id);
    try {
      const update: Record<string, any> =
        nextStatus === 'APPROVED'
          ? { status: 'APPROVED', approved_at: new Date().toISOString(), rework_reason: null }
          : { status: 'REWORK', approved_at: null, rework_reason: reason || null };

      const { error } = await supabase
        .from('test_tasks')
        .update(update as any)
        .eq('id', task.id);

      if (error) throw error;

      // Sync equipment_instance status
      const equipId = task.equipment_instance?.id;
      if (equipId) {
        const remaining = pendingTests.filter(t => t.id !== task.id && t.equipment_instance?.id === equipId);
        const newEquipStatus = rollUpInstanceStatusAfterApproval(remaining.map(t => t.status), nextStatus);
        await supabase.from('equipment_instances').update({ status: newEquipStatus }).eq('id', equipId);
      }

      queryClient.invalidateQueries({ queryKey: ['supervisor-pending-tests', user?.id] });

      toast({
        title: nextStatus === 'APPROVED' ? 'Test approved' : 'Sent back for rework',
        description: nextStatus === 'APPROVED'
          ? 'The test has been approved.'
          : 'The engineer will be asked to update and resubmit.',
      });
    } catch (error: any) {
      toast({ title: 'Review failed', description: error.message ?? 'Unable to update test status', variant: 'destructive' });
    } finally {
      setReviewingTaskId(null);
    }
  };

  const toggleSelect = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedTaskIds(prev =>
      prev.size === pendingTests.length ? new Set() : new Set(pendingTests.map(t => t.id)),
    );
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedTaskIds);
    if (!ids.length) return;
    setBulkApproving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('test_tasks')
        .update({ status: 'APPROVED', approved_at: now, rework_reason: null })
        .in('id', ids)
        .eq('status', 'SUBMITTED'); // concurrency guard: skip anything already moved
      if (error) throw error;

      // Sync each touched equipment_instance status — if any pending tasks
      // remain for that instance after approval, leave as SUBMITTED; otherwise APPROVED.
      const instanceIds = [...new Set(pendingTests.filter(t => ids.includes(t.id)).map(t => t.equipment_instance?.id).filter(Boolean))] as string[];
      for (const equipId of instanceIds) {
        const remaining = pendingTests.filter(t => !ids.includes(t.id) && t.equipment_instance?.id === equipId);
        const newStatus = rollUpInstanceStatusAfterApproval(remaining.map(t => t.status), 'APPROVED');
        await supabase.from('equipment_instances').update({ status: newStatus }).eq('id', equipId);
      }

      toast({ title: `Approved ${ids.length} test${ids.length === 1 ? '' : 's'}` });
      setSelectedTaskIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['supervisor-pending-tests', user?.id] });
    } catch (err) {
      console.error('Bulk approve failed:', err);
      const message = err instanceof Error ? err.message : 'Bulk approve failed';
      toast({ title: 'Bulk approve failed', description: message, variant: 'destructive' });
    } finally {
      setBulkApproving(false);
    }
  };

  const handleReworkClick = (task: PendingTest) => {
    setReworkDialogTask(task);
    setReworkReason('');
  };

  const handleReworkConfirm = async () => {
    if (!reworkDialogTask) return;
    setSubmittingRework(true);
    await handleTaskReview(reworkDialogTask, 'REWORK', reworkReason.trim() || undefined);
    setSubmittingRework(false);
    setReworkDialogTask(null);
    setReworkReason('');
  };

  return (
    <DashboardLayout title="Manager Dashboard" breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: 'Assigned Projects', value: stats.total,        icon: <FolderOpen className="h-4 w-4" />, tone: 'default' as const },
          { label: 'Active Projects',   value: stats.active,       icon: <ClipboardCheck className="h-4 w-4" />, tone: 'default' as const },
          { label: 'Pending Start',     value: stats.pendingStart, icon: <AlertCircle className="h-4 w-4" />, tone: 'warning' as const },
          { label: 'Pending Review',    value: stats.pendingReview,icon: <ClipboardCheck className="h-4 w-4" />, tone: stats.pendingReview > 0 ? 'danger' as const : 'default' as const },
        ].map(s => (
          <motion.div key={s.label} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
            <MetricCard label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
          </motion.div>
        ))}
      </div>

      {/* Pending test approvals */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Tests Pending Approval
            {pendingTests.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingTests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Tests submitted by engineers that need your review</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingTests.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={28} />} title="No tests pending review" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedTaskIds.size > 0 && selectedTaskIds.size === pendingTests.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                  <span className="text-muted-foreground">
                    {selectedTaskIds.size > 0
                      ? `${selectedTaskIds.size} selected`
                      : `Select all ${pendingTests.length}`}
                  </span>
                </div>
                {selectedTaskIds.size > 0 && (
                  <Button size="sm" onClick={handleBulkApprove} disabled={bulkApproving}>
                    {bulkApproving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    Approve selected ({selectedTaskIds.size})
                  </Button>
                )}
              </div>
              {pendingTests.map(task => (
                <ReviewQueueItem
                  key={task.id}
                  testName={task.test_template?.test_name ?? 'Unknown test'}
                  testCode={task.test_template?.test_code ?? ''}
                  equipmentLabel={task.equipment_instance?.label ?? ''}
                  equipmentType={task.equipment_instance?.equipment_type ?? ''}
                  projectNumber={task.project_number}
                  selected={selectedTaskIds.has(task.id)}
                  reviewing={reviewingTaskId === task.id}
                  onToggleSelect={() => toggleSelect(task.id)}
                  onOpenProject={() => navigate(`/projects/${task.project_id}?tab=tests`)}
                  onRework={() => handleReworkClick(task)}
                  onApprove={() => handleTaskReview(task, 'APPROVED')}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned projects list */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Assigned Projects</CardTitle>
          <CardDescription>Projects assigned to you by General Managers</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={28} />}
              title="No projects assigned yet"
              description="Projects will appear here when a General Manager assigns them to you."
            />
          ) : (
            <div className="space-y-4">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div>
                    <h3 className="font-semibold">{project.project_number}</h3>
                    <p className="text-sm text-muted-foreground">{project.site_name}</p>
                    <p className="text-xs text-muted-foreground">{project.site_address}</p>
                    {project.start_date && (
                      <p className="text-xs text-muted-foreground">Start: {formatDate(project.start_date)}</p>
                    )}
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rework reason dialog */}
      <Dialog open={!!reworkDialogTask} onOpenChange={open => { if (!open) { setReworkDialogTask(null); setReworkReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back for Rework</DialogTitle>
            <DialogDescription>
              Provide a reason so the engineer knows what to correct.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rework-reason-sv">Rework Reason</Label>
            <Textarea
              id="rework-reason-sv"
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
            <Button
              variant="destructive"
              disabled={submittingRework}
              onClick={handleReworkConfirm}
            >
              {submittingRework && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send for Rework
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
