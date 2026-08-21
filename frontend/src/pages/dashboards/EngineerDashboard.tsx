import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricCard } from '@/components/MetricCard';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/format';
import { motion } from 'framer-motion';

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

  const { data, isLoading: loading } = useQuery({
    queryKey: ['engineer-projects', user?.id],
    queryFn: async () => {
      const { data: myTasks, error: tasksError } = await supabase
        .from('test_tasks').select('id, status, equipment_instance_id').eq('assigned_to', user!.id);
      if (tasksError) throw tasksError;
      if (!myTasks?.length) return { projects: [], stats: { total: 0, inProgress: 0, completed: 0 } };

      const instanceIds = [...new Set(myTasks.map(t => t.equipment_instance_id))];
      const { data: instances } = await supabase
        .from('equipment_instances').select('id, project_id').in('id', instanceIds);

      const projectIds = [...new Set((instances || []).map(i => i.project_id))];
      const { data: projectData } = await supabase
        .from('projects').select('id, project_number, site_name, site_address, start_date, status').in('id', projectIds);

      const enriched: AssignedProject[] = (projectData || []).map(p => {
        const projectInstanceIds = (instances || []).filter(i => i.project_id === p.id).map(i => i.id);
        const projectTasks = myTasks.filter(t => projectInstanceIds.includes(t.equipment_instance_id));
        return {
          ...p,
          equipmentCount: projectInstanceIds.length,
          taskCount: projectTasks.length,
          completedCount: projectTasks.filter(t => t.status === 'APPROVED').length,
          submittedCount: projectTasks.filter(t => t.status === 'SUBMITTED' || t.status === 'IN_PROGRESS').length,
        };
      });

      return {
        projects: enriched,
        stats: {
          total: myTasks.length,
          inProgress: myTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'SUBMITTED').length,
          completed: myTasks.filter(t => t.status === 'APPROVED').length,
        },
      };
    },
    enabled: !!user,
  });

  const projects = data?.projects ?? [];
  const stats = data?.stats ?? { total: 0, inProgress: 0, completed: 0 };

  const statCards = [
    {
      title: 'Assigned Tests',
      value: stats.total,
      icon: <Wrench className="h-4 w-4 text-primary" />,
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: <Clock className="h-4 w-4 text-accent" />,
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: <CheckCircle className="h-4 w-4 text-success" />,
    },
  ];

  return (
    <DashboardLayout title="Engineer Dashboard">
      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
          >
            <MetricCard label={card.title} value={card.value} icon={card.icon} />
          </motion.div>
        ))}
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
            <EmptyState
              icon={<Wrench size={28} />}
              title="No assignments yet"
              description="Your manager will assign test scopes to you."
            />
          ) : (
            <div className="space-y-3">
              {projects.map((project, i) => {
                const pct = project.taskCount > 0
                  ? Math.round((project.completedCount / project.taskCount) * 100)
                  : 0;
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                    whileHover={{ x: 4 }}
                    className="flex items-start justify-between p-4 border border-border rounded-lg hover:border-primary/30 hover:bg-muted/40 transition-colors cursor-pointer gap-4"
                    onClick={() => navigate(`/engineer/projects/${project.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm">{project.project_number}</h3>
                        <StatusBadge status={project.status} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{project.site_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{project.site_address}</p>
                      {project.start_date && (
                        <p className="text-xs text-muted-foreground">Start: {formatDate(project.start_date)}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.equipmentCount} equipment · {project.completedCount}/{project.taskCount} approved
                      </p>
                      <ProgressBar value={pct} showPercentage tone="success" className="mt-2" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
