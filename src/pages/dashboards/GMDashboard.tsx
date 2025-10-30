import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FolderOpen, CheckCircle, Clock, UserCheck, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { AssignProjectDialog } from '@/components/AssignProjectDialog';
import { useNavigate } from 'react-router-dom';

export default function GMDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, closed: 0, assigned: 0, unassigned: 0 });
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();

    // Subscribe to realtime changes on projects table
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('Project change detected:', payload);
          fetchProjects(); // Refetch all projects when any change occurs
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        assigned_supervisor:profiles!projects_assigned_to_fkey(id, name)
      `)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setProjects(data);
      setStats({
        total: data.length,
        active: data.filter(p => p.status === 'ACTIVE').length,
        closed: data.filter(p => p.status === 'CLOSED').length,
        assigned: data.filter(p => p.assigned_to).length,
        unassigned: data.filter(p => !p.assigned_to).length,
      });
    }
  };

  const handleAssignClick = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowAssignDialog(true);
  };

  const filteredProjects = projects.filter(project => {
    if (assignmentFilter === 'assigned') return project.assigned_to;
    if (assignmentFilter === 'unassigned') return !project.assigned_to;
    return true;
  });

  return (
    <DashboardLayout title="General Manager Dashboard">
      <div className="flex justify-between items-center mb-6">
        <div className="grid gap-4 md:grid-cols-5 flex-1 mr-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.closed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.assigned}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.unassigned}</div>
            </CardContent>
          </Card>
        </div>
        
        <Button onClick={() => navigate('/projects/new')} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Test Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Manage your test plans and equipment scope</CardDescription>
            </div>
            <Tabs value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="assigned">Assigned</TabsTrigger>
                <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={() => navigate('/projects/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Test Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{project.project_number}</h3>
                    <p className="text-sm text-muted-foreground">{project.site_name}</p>
                    <p className="text-xs text-muted-foreground">{project.site_address}</p>
                    {project.assigned_supervisor && (
                      <div className="flex items-center gap-2 mt-1">
                        <UserCheck className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Assigned to: <span className="font-medium">{project.assigned_supervisor.name}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleAssignClick(project, e)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      {project.assigned_to ? 'Reassign' : 'Assign'}
                    </Button>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <AssignProjectDialog
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          projectId={selectedProject.id}
          projectNumber={selectedProject.project_number}
          currentAssignment={selectedProject.assigned_supervisor}
          onSuccess={fetchProjects}
        />
      )}
    </DashboardLayout>
  );
}
