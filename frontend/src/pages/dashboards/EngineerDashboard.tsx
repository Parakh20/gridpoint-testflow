import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { AnimatedCounter } from '@/components/AnimatedCounter';
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

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_number, site_name, site_address, start_date, status')
        .in('id', projectIds);

      if (projectError) throw projectError;

      const { data: tasks } = await supabase
        .from('test_tasks')
        .select('id, status, equipment_instance_id')
        .in('equipment_instance_id', instanceIds);

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

  const statCards = [
    {
      title: 'Assigned Tests',
      value: stats.total,
      label: 'Total test tasks assigned',
      icon: <Wrench className="h-4 w-4 text-primary" />,
      color: '',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      label: 'Active tests',
      icon: <Clock className="h-4 w-4 text-accent" />,
      color: 'text-accent',
    },
    {
      title: 'Completed',
      value: stats.completed,
      label: 'Approved tests',
      icon: <CheckCircle className="h-4 w-4 text-success" />,
      color: 'text-success',
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.color}`}>
                  <AnimatedCounter value={card.value} />
                </div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
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
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assignments yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your manager will assign equipment instances to you
              </p>
            </div>
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
                      {/* Progress bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-success"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 + 0.2 }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
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
