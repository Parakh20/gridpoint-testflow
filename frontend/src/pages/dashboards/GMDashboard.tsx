import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FolderOpen, CheckCircle, Clock, UserCheck, UserX, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { AssignProjectDialog } from '@/components/AssignProjectDialog';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/format';
import { useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

type Project = Tables<'projects'> & {
  assigned_supervisor: { id: string; name: string } | null;
};

const PAGE_SIZE = 20;

const isOverdue = (endDate: string | null, status: string) =>
  !!endDate && new Date(endDate) < new Date() && status !== 'CLOSED';

async function fetchAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) throw error ?? new Error('No data');

  const assignedIds = [...new Set(data.map(p => p.assigned_to).filter(Boolean))] as string[];
  let profileMap: Record<string, { id: string; name: string }> = {};
  if (assignedIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', assignedIds);
    if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
  }

  return data.map(p => ({
    ...p,
    assigned_supervisor: p.assigned_to ? (profileMap[p.assigned_to] ?? null) : null,
  })) as Project[];
}

export default function GMDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['gm-projects'],
    queryFn: fetchAllProjects,
    staleTime: 30_000,
  });

  // Realtime — invalidate query on any project change
  useEffect(() => {
    const channel = supabase
      .channel('gm-projects-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' },
        () => queryClient.invalidateQueries({ queryKey: ['gm-projects'] }))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' },
        () => queryClient.invalidateQueries({ queryKey: ['gm-projects'] }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchQuery, assignmentFilter]);

  const stats = useMemo(() => ({
    total:      projects.length,
    active:     projects.filter(p => p.status === 'ACTIVE').length,
    closed:     projects.filter(p => p.status === 'CLOSED').length,
    assigned:   projects.filter(p => p.assigned_to).length,
    unassigned: projects.filter(p => !p.assigned_to).length,
  }), [projects]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return projects.filter(p => {
      const matchesFilter =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && p.assigned_to) ||
        (assignmentFilter === 'unassigned' && !p.assigned_to);
      const matchesSearch =
        !q ||
        p.project_number.toLowerCase().includes(q) ||
        p.site_name.toLowerCase().includes(q) ||
        (p.client ?? '').toLowerCase().includes(q) ||
        p.site_address.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [projects, assignmentFilter, searchQuery]);

  const visibleProjects = filteredProjects.slice(0, visibleCount);
  const hasMore = filteredProjects.length > visibleCount;

  const handleAssignClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowAssignDialog(true);
  };

  return (
    <DashboardLayout title="General Manager Dashboard">
      <div className="flex justify-between items-center mb-6">
        <div className="grid gap-4 md:grid-cols-5 flex-1 mr-6">
          {[
            { label: 'Total Projects', value: stats.total,     icon: <FolderOpen className="h-4 w-4 text-muted-foreground" />, color: 'text-foreground' },
            { label: 'Active',         value: stats.active,    icon: <Clock className="h-4 w-4 text-amber-400" />,            color: 'text-amber-400' },
            { label: 'Completed',      value: stats.closed,    icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,    color: 'text-emerald-400' },
            { label: 'Assigned',       value: stats.assigned,  icon: <UserCheck className="h-4 w-4 text-blue-400" />,         color: 'text-blue-400' },
            { label: 'Unassigned',     value: stats.unassigned,icon: <UserX className="h-4 w-4 text-orange-400" />,           color: 'text-orange-400' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -2 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                  {s.icon}
                </CardHeader>
                <CardContent>
                  {isLoading
                    ? <Skeleton className="h-8 w-16" />
                    : <div className={`text-2xl font-bold font-mono ${s.color}`}><AnimatedCounter value={s.value} /></div>
                  }
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Button onClick={() => navigate('/projects/new')} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Test Plan
        </Button>
      </div>

      {/* Analytics charts */}
      {projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Project Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { name: 'Draft',    value: projects.filter(p => p.status === 'DRAFT').length,    fill: '#94a3b8' },
                  { name: 'Approved', value: projects.filter(p => p.status === 'APPROVED').length, fill: '#60a5fa' },
                  { name: 'Active',   value: projects.filter(p => p.status === 'ACTIVE').length,   fill: '#34d399' },
                  { name: 'Closed',   value: projects.filter(p => p.status === 'CLOSED').length,   fill: '#a78bfa' },
                ]} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {['#94a3b8','#60a5fa','#34d399','#a78bfa'].map((fill, i) => <Cell key={i} fill={fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Assignment Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[{ name: 'Assigned', value: stats.assigned }, { name: 'Unassigned', value: stats.unassigned }]}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value"
                  >
                    <Cell fill="#34d399" /><Cell fill="#f87171" />
                  </Pie>
                  <Tooltip /><Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading…' : `${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''}${filteredProjects.length !== projects.length ? ` (filtered from ${projects.length})` : ''}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 w-56"
                />
              </div>
              <Tabs value={assignmentFilter} onValueChange={v => setAssignmentFilter(v as typeof assignmentFilter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="assigned">Assigned</TabsTrigger>
                  <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={() => navigate('/projects/new')}>
                <Plus className="h-4 w-4 mr-2" />Create Your First Test Plan
              </Button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects match your search</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleProjects.map(project => (
                  <motion.div
                    key={project.id}
                    whileHover={{ x: 3 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{project.project_number}</h3>
                      <p className="text-sm text-muted-foreground">{project.site_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{project.site_address}</p>
                      {project.client && <p className="text-xs text-muted-foreground">Client: {project.client}</p>}
                      {project.start_date && <p className="text-xs text-muted-foreground">Start: {formatDate(project.start_date)}</p>}
                      {project.assigned_supervisor && (
                        <div className="flex items-center gap-1 mt-1">
                          <UserCheck className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Assigned to: <span className="font-medium text-foreground">{project.assigned_supervisor.name}</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={e => handleAssignClick(project, e)}>
                        <UserCheck className="h-4 w-4 mr-1" />
                        {project.assigned_to ? 'Reassign' : 'Assign'}
                      </Button>
                      {isOverdue(project.end_date, project.status) && (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      )}
                      <StatusBadge status={project.status} />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Load more pagination (#16) */}
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                    Show more ({filteredProjects.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
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
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['gm-projects'] })}
        />
      )}
    </DashboardLayout>
  );
}
