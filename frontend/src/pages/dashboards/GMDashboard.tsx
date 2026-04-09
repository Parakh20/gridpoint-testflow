import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FolderOpen, CheckCircle, Clock, UserCheck, UserX, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { AssignProjectDialog } from '@/components/AssignProjectDialog';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/format';
import type { Tables } from '@/integrations/supabase/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type Project = Tables<'projects'> & {
  assigned_supervisor: { id: string; name: string } | null;
};

export default function GMDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, closed: 0, assigned: 0, unassigned: 0 });
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();

    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects' },
        () => fetchProjects()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        () => fetchProjects()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching projects:', error);
      return;
    }

    // Fetch supervisor profiles for assigned projects
    const assignedIds = [...new Set(data.map(p => p.assigned_to).filter(Boolean))] as string[];
    let profileMap: Record<string, { id: string; name: string }> = {};
    if (assignedIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', assignedIds);
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }
    }

    const enriched = data.map(p => ({
      ...p,
      assigned_supervisor: p.assigned_to ? (profileMap[p.assigned_to] ?? null) : null,
    }));

    setProjects(enriched as Project[]);
    setStats({
      total:      data.length,
      active:     data.filter(p => p.status === 'ACTIVE').length,
      closed:     data.filter(p => p.status === 'CLOSED').length,
      assigned:   data.filter(p => p.assigned_to).length,
      unassigned: data.filter(p => !p.assigned_to).length,
    });
  };

  const handleAssignClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowAssignDialog(true);
  };

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return projects.filter(project => {
      const matchesFilter =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && project.assigned_to) ||
        (assignmentFilter === 'unassigned' && !project.assigned_to);

      const matchesSearch =
        !q ||
        project.project_number.toLowerCase().includes(q) ||
        project.site_name.toLowerCase().includes(q) ||
        (project.client ?? '').toLowerCase().includes(q) ||
        project.site_address.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [projects, assignmentFilter, searchQuery]);

  return (
    <DashboardLayout title="General Manager Dashboard">
      <div className="flex justify-between items-center mb-6">
        <div className="grid gap-4 md:grid-cols-5 flex-1 mr-6">
          {[
            { label: 'Total Projects', value: stats.total,     icon: <FolderOpen className="h-4 w-4 text-muted-foreground" />, color: 'text-foreground' },
            { label: 'Active',        value: stats.active,     icon: <Clock className="h-4 w-4 text-amber-400" />,           color: 'text-amber-400' },
            { label: 'Completed',     value: stats.closed,     icon: <CheckCircle className="h-4 w-4 text-emerald-400" />,   color: 'text-emerald-400' },
            { label: 'Assigned',      value: stats.assigned,   icon: <UserCheck className="h-4 w-4 text-blue-400" />,        color: 'text-blue-400' },
            { label: 'Unassigned',    value: stats.unassigned, icon: <UserX className="h-4 w-4 text-orange-400" />,          color: 'text-orange-400' },
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
        <div className="grid gap-4 md:grid-cols-2 mb-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Project Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { name: 'Draft', value: projects.filter(p => p.status === 'DRAFT').length, fill: '#94a3b8' },
                  { name: 'Approved', value: projects.filter(p => p.status === 'APPROVED').length, fill: '#60a5fa' },
                  { name: 'Active', value: projects.filter(p => p.status === 'ACTIVE').length, fill: '#34d399' },
                  { name: 'Closed', value: projects.filter(p => p.status === 'CLOSED').length, fill: '#a78bfa' },
                ]} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { fill: '#94a3b8' },
                      { fill: '#60a5fa' },
                      { fill: '#34d399' },
                      { fill: '#a78bfa' },
                    ].map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
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
                    data={[
                      { name: 'Assigned', value: stats.assigned },
                      { name: 'Unassigned', value: stats.unassigned },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#34d399" />
                    <Cell fill="#f87171" />
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} />
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
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Manage your test plans and equipment scope</CardDescription>
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
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={() => navigate('/projects/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Test Plan
              </Button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects match your search</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map(project => (
                <motion.div
                  key={project.id}
                  whileHover={{ y: -1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{project.project_number}</h3>
                    <p className="text-sm text-muted-foreground">{project.site_name}</p>
                    <p className="text-xs text-muted-foreground">{project.site_address}</p>
                    {project.client && (
                      <p className="text-xs text-muted-foreground">Client: {project.client}</p>
                    )}
                    {project.start_date && (
                      <p className="text-xs text-muted-foreground">Start: {formatDate(project.start_date)}</p>
                    )}
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
                      onClick={e => handleAssignClick(project, e)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      {project.assigned_to ? 'Reassign' : 'Assign'}
                    </Button>
                    <StatusBadge status={project.status} />
                  </div>
                </motion.div>
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
