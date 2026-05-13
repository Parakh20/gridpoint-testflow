import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2, BarChart2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/format';
import { motion } from 'framer-motion';
import type { Tables } from '@/integrations/supabase/types';

type Project = Pick<
  Tables<'projects'>,
  'id' | 'project_number' | 'site_name' | 'site_address' | 'client' | 'status' | 'start_date' | 'end_date'
>;

export default function ReportsList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, project_number, site_name, site_address, client, status, start_date, end_date')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects for reports:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetch();
  }, []);

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-muted-foreground mt-1">Select a project to view its full test report</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <BarChart2 className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No projects found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/reports/${project.id}`)}
                >
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
                        <BarChart2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{project.project_number}</span>
                          <StatusBadge status={project.status} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{project.site_name}</p>
                        {project.client && (
                          <p className="text-xs text-muted-foreground truncate">{project.client}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      {project.start_date && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">Start</p>
                          <p className="text-sm">{formatDate(project.start_date)}</p>
                        </div>
                      )}
                      {project.end_date && (
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-muted-foreground">End</p>
                          <p className="text-sm">{formatDate(project.end_date)}</p>
                        </div>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
