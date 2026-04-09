import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, AlertCircle, FolderOpen, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import type { Tables } from '@/integrations/supabase/types';

type Project = Tables<'projects'>;

interface PendingTest {
  id: string;
  status: string;
  equipment_instance: { id: string; label: string; equipment_type: string } | null;
  test_template: { test_name: string; test_code: string } | null;
  project_id: string;
  project_number: string;
}

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingTests, setPendingTests] = useState<PendingTest[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pendingStart: 0, pendingReview: 0 });
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [reworkDialogTask, setReworkDialogTask] = useState<PendingTest | null>(null);
  const [reworkReason, setReworkReason] = useState('');
  const [submittingRework, setSubmittingRework] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchAll();

    const channel = supabase
      .channel('supervisor-projects-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects', filter: `assigned_to=eq.${user.id}` }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `assigned_to=eq.${user.id}` }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'test_tasks' }, () => fetchPendingTests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchAll = async () => {
    await Promise.all([fetchAssignedProjects(), fetchPendingTests()]);
  };

  const fetchAssignedProjects = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setProjects(data);
      setStats(prev => ({
        ...prev,
        total:        data.length,
        active:       data.filter(p => p.status === 'ACTIVE').length,
        pendingStart: data.filter(p => p.status === 'APPROVED').length,
      }));
    }
  };

  const fetchPendingTests = async () => {
    if (!user) return;

    // Get all projects assigned to this supervisor
    const { data: myProjects } = await supabase
      .from('projects')
      .select('id, project_number')
      .eq('assigned_to', user.id);

    if (!myProjects?.length) {
      setPendingTests([]);
      setStats(prev => ({ ...prev, pendingReview: 0 }));
      return;
    }

    const projectIds = myProjects.map(p => p.id);
    const projectMap = Object.fromEntries(myProjects.map(p => [p.id, p.project_number]));

    // Get equipment instances for these projects
    const { data: instances } = await supabase
      .from('equipment_instances')
      .select('id, project_id')
      .in('project_id', projectIds);

    if (!instances?.length) {
      setPendingTests([]);
      setStats(prev => ({ ...prev, pendingReview: 0 }));
      return;
    }

    const instanceIds = instances.map(i => i.id);
    const instanceProjectMap = Object.fromEntries(instances.map(i => [i.id, i.project_id]));

    // Get SUBMITTED test tasks
    const { data: tasks, error } = await supabase
      .from('test_tasks')
      .select(`
        id, status,
        equipment_instance:equipment_instances(id, label, equipment_type),
        test_template:test_templates(test_name, test_code),
        equipment_instance_id
      `)
      .in('equipment_instance_id', instanceIds)
      .eq('status', 'SUBMITTED')
      .order('created_at');

    if (error) return;

    const enriched: PendingTest[] = (tasks || []).map(t => ({
      id: t.id,
      status: t.status,
      equipment_instance: t.equipment_instance,
      test_template: t.test_template,
      project_id: instanceProjectMap[t.equipment_instance_id] || '',
      project_number: projectMap[instanceProjectMap[t.equipment_instance_id]] || '',
    }));

    setPendingTests(enriched);
    setStats(prev => ({ ...prev, pendingReview: enriched.length }));
  };

  const handleTaskReview = async (task: PendingTest, nextStatus: 'APPROVED' | 'REWORK', reason?: string) => {
    setReviewingTaskId(task.id);
    try {
      const update: Record<string, any> =
        nextStatus === 'APPROVED'
          ? { status: 'APPROVED', approved_at: new Date().toISOString(), rework_reason: null }
          : { status: 'REWORK', approved_at: null, rework_reason: reason || null };

      const { error } = await supabase
        .from('test_tasks')
        .update(update)
        .eq('id', task.id);

      if (error) throw error;

      // Sync equipment_instance status
      const equipId = task.equipment_instance?.id;
      if (equipId) {
        const remaining = pendingTests.filter(t => t.id !== task.id && t.equipment_instance?.id === equipId);
        const newEquipStatus = remaining.length > 0 ? 'SUBMITTED' : (nextStatus === 'APPROVED' ? 'APPROVED' : 'REWORK');
        await supabase.from('equipment_instances').update({ status: newEquipStatus }).eq('id', equipId);
      }

      setPendingTests(prev => prev.filter(t => t.id !== task.id));
      setStats(prev => ({ ...prev, pendingReview: Math.max(0, prev.pendingReview - 1) }));

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
    <DashboardLayout title="Supervisor Dashboard">
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: 'Assigned Projects', value: stats.total,        icon: <FolderOpen className="h-4 w-4 text-muted-foreground" />,  color: 'text-foreground',    sub: 'Total projects assigned' },
          { label: 'Active Projects',   value: stats.active,       icon: <ClipboardCheck className="h-4 w-4 text-cyan-400" />,      color: 'text-cyan-400',      sub: 'Currently in progress' },
          { label: 'Pending Start',     value: stats.pendingStart, icon: <AlertCircle className="h-4 w-4 text-amber-400" />,        color: 'text-amber-400',     sub: 'Awaiting activation' },
          { label: 'Pending Review',    value: stats.pendingReview,icon: <ClipboardCheck className="h-4 w-4 text-orange-400" />,    color: 'text-orange-400',    sub: 'Tests awaiting approval' },
        ].map(s => (
          <motion.div key={s.label} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                {s.icon}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono ${s.color}`}>
                  <AnimatedCounter value={s.value} />
                </div>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
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
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">No tests pending review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTests.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{task.test_template?.test_name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{task.test_template?.test_code}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{task.equipment_instance?.label}</span>
                      <span>•</span>
                      <span>{task.equipment_instance?.equipment_type.replace(/_/g, ' ')}</span>
                      <span>•</span>
                      <button
                        className="text-primary underline-offset-2 hover:underline"
                        onClick={() => navigate(`/projects/${task.project_id}?tab=tests`)}
                      >
                        {task.project_number}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewingTaskId === task.id}
                      onClick={() => handleReworkClick(task)}
                    >
                      {reviewingTaskId === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                      Rework
                    </Button>
                    <Button
                      size="sm"
                      disabled={reviewingTaskId === task.id}
                      onClick={() => handleTaskReview(task, 'APPROVED')}
                    >
                      {reviewingTaskId === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Approve
                    </Button>
                  </div>
                </div>
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
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects assigned yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Projects will appear here when a General Manager assigns them to you
              </p>
            </div>
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
