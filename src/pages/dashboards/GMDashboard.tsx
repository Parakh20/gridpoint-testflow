import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FolderOpen, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';

export default function GMDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, closed: 0 });
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
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setProjects(data);
      setStats({
        total: data.length,
        active: data.filter(p => p.status === 'ACTIVE').length,
        closed: data.filter(p => p.status === 'CLOSED').length,
      });
    }
  };

  return (
    <DashboardLayout title="General Manager Dashboard">
      <div className="flex justify-between items-center mb-6">
        <div className="grid gap-4 md:grid-cols-3 flex-1 mr-6">
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
        </div>
        
        <Button onClick={() => navigate('/projects/new')} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Test Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
          <CardDescription>Manage your test plans and equipment scope</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
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
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div>
                    <h3 className="font-semibold">{project.project_number}</h3>
                    <p className="text-sm text-muted-foreground">{project.site_name}</p>
                    <p className="text-xs text-muted-foreground">{project.site_address}</p>
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
