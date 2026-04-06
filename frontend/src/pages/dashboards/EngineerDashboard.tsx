import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Clock, CheckCircle, Loader2, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/format';

interface AssignedProject {
  id: string;
  project_number: string;
  site_name: string;
  site_address: string;
  start_date: string | null;
  status: string;
  equipmentCount: number;
  taskCount: number;
  completedCount: number;
  submittedCount: number;
}

export default function EngineerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0 });

  useEffect(() => {
    if (!user) return;
    fetchAssignedProjects();
  }, [user]);

  const fetchAssignedProjects = async () => {
    if (!user) return;
    try {
      // Get equipment instances assigned to this engineer
      const { data: instances, error: instanceError } = await supabase
        .from('equipment_instances')
        .select('id, project_id')
        .eq('assigned_to', user.id);

      if (instanceError) throw instanceError;
      if (!instances?.length) {
        setLoading(false);
        return;
      }

      const instanceIds = instances.map(i => i.id);
      const projectIds = [...new Set(instances.map(i => i.project_id))];

      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_number, site_name, site_address, start_date, status')
        .in('id', projectIds);

      if (projectError) throw projectError;

      // Fetch test tasks for these instances
      const { data: tasks } = await supabase
        .from('test_tasks')
        .select('id, status, equipment_instance_id')
        .in('equipment_instance_id', instanceIds);

      // Build project list with counts
      const enriched = (projectData || []).map(p => {
        const projectInstanceIds = instances.filter(i => i.project_id === p.id).map(i => i.id);
        const projectTasks = (tasks || []).filter(t => projectInstanceIds.includes(t.equipment_instance_id));
        return {
          ...p,
          equipmentCount: projectInstanceIds.length,
          taskCount: projectTasks.length,
          completedCount: projectTasks.filter(t => t.status === 'APPROVED').length,
          submittedCount: projectTasks.filter(t => t.status === 'SUBMITTED' || t.status === 'IN_PROGRESS').length,
        };
      });

      setProjects(enriched);
      const allTasks = tasks || [];
      setStats({
        total: allTasks.length,
        inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'SUBMITTED').length,
        completed: allTasks.filter(t => t.status === 'APPROVED').length,
      });
    } catch (error) {
      console.error('Error fetching assigned projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Engineer Dashboard">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tests</CardTitle>
            <Wrench className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total test tasks assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Active tests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Approved tests</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>My Projects</CardTitle>
          <CardDescription>Projects with equipment assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assignments yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your supervisor will assign equipment instances to you
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/engineer/projects/${project.id}`)}
                >
                  <div>
                    <h3 className="font-semibold">{project.project_number}</h3>
                    <p className="text-sm text-muted-foreground">{project.site_name}</p>
                    <p className="text-xs text-muted-foreground">{project.site_address}</p>
                    {project.start_date && (
                      <p className="text-xs text-muted-foreground">Start: {formatDate(project.start_date)}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.equipmentCount} equipment · {project.completedCount} approved · {project.submittedCount} in review · {project.taskCount} total
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
