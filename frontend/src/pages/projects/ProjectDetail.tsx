import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2, ArrowLeft, Download, UserCheck, RefreshCw, FileText, Pencil } from 'lucide-react';
import { ProjectStatusActions } from '@/components/ProjectStatusActions';
import { ProjectScopeTab } from '@/components/ProjectScopeTab';
import { ProjectTestingScopeTab } from '@/components/ProjectTestingScopeTab';
import { ProjectEquipmentTab } from '@/components/ProjectEquipmentTab';
import { ProjectTestsTab } from '@/components/ProjectTestsTab';
import { ProjectActivityTab } from '@/components/ProjectActivityTab';
import { ProjectPDFExport } from '@/components/ProjectPDFExport';
import { AssignProjectDialog } from '@/components/AssignProjectDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardPath } from '@/lib/routes';
import { formatDate } from '@/lib/format';
import type { Tables } from '@/integrations/supabase/types';

type Project = Tables<'projects'>;

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [hasEquipment, setHasEquipment] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignedSupervisor, setAssignedSupervisor] = useState<{ id: string; name: string } | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);

  const fetchProject = async (isRefetch = false) => {
    if (!id) return;
    if (isRefetch) setRefetching(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);

      const { data: equipmentData } = await supabase
        .from('equipment_instances')
        .select('id')
        .eq('project_id', id)
        .limit(1);

      setHasEquipment(!!equipmentData?.length);

      if (data.assigned_to) {
        const { data: supervisorData } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', data.assigned_to)
          .single();
        setAssignedSupervisor(supervisorData ?? null);
      } else {
        setAssignedSupervisor(null);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  };

  useEffect(() => { fetchProject(); }, [id]);

  const handleStatusChange = () => fetchProject(true);

  // Optimistic update: mutate local state immediately, server refetch confirms it
  const handleOptimisticStatusUpdate = (newStatus: string) => {
    setProject(prev => prev ? { ...prev, status: newStatus as any } : prev);
  };

  const handleGenerateReport = async () => {
    if (!id) return;
    setGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { project_id: id },
      });
      if (error) throw error;
      setReportMarkdown(data?.report ?? data ?? 'No report content returned.');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Report generation failed',
        description: error.message ?? 'Unable to generate AI report',
        variant: 'destructive',
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Project Details">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout title="Project Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
          <Button onClick={() => navigate(dashboardPath(userRole))} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Project Details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(dashboardPath(userRole))}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <h2 className="text-2xl font-bold">{project.project_number}</h2>
              <StatusBadge status={project.status} />
              {refetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
              {assignedSupervisor && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Assigned to: <span className="font-medium text-foreground">{assignedSupervisor.name}</span>
                    </span>
                  </div>
                </>
              )}
            </div>
            <p className="text-lg text-muted-foreground">{project.site_name}</p>
          </div>
          <div className="flex gap-2">
            {(userRole === 'GM' || userRole === 'SUPERADMIN') &&
              (project.status === 'DRAFT' || project.status === 'APPROVED') && (
              <Button variant="outline" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
              <UserCheck className="h-4 w-4 mr-2" />
              {assignedSupervisor ? 'Reassign' : 'Assign'}
            </Button>
            <Button variant="outline" onClick={() => setShowPDF(true)}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {(userRole === 'GM' || userRole === 'SUPERADMIN') && project.status === 'CLOSED' && (
              <Button variant="outline" disabled={generatingReport} onClick={handleGenerateReport}>
                {generatingReport
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <FileText className="h-4 w-4 mr-2" />}
                {generatingReport ? 'Generating…' : 'AI Report'}
              </Button>
            )}
            <ProjectStatusActions
              project={project}
              onStatusChange={handleStatusChange}
              onOptimisticUpdate={handleOptimisticStatusUpdate}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className={`grid w-full ${hasEquipment ? 'grid-cols-6' : 'grid-cols-4'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scope">Scope</TabsTrigger>
            <TabsTrigger value="testing-scope">Testing Scope</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            {hasEquipment && (
              <>
                <TabsTrigger value="equipment">Equipment</TabsTrigger>
                <TabsTrigger value="tests">Tests</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Project Number</p>
                    <p className="text-base">{project.project_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <StatusBadge status={project.status} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Site Name</p>
                    <p className="text-base">{project.site_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Client</p>
                    <p className="text-base">{project.client || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Site Address</p>
                    <p className="text-base">{project.site_address}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                    <p className="text-base">{formatDate(project.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">End Date</p>
                    <p className="text-base">{formatDate(project.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-base">{formatDate(project.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scope">
            <ProjectScopeTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="testing-scope">
            <ProjectTestingScopeTab
              projectId={project.id}
              projectStatus={project.status}
              onEquipmentGenerated={() => setHasEquipment(true)}
            />
          </TabsContent>

          <TabsContent value="activity">
            <ProjectActivityTab projectId={project.id} />
          </TabsContent>

          {hasEquipment && (
            <>
              <TabsContent value="equipment">
                <ProjectEquipmentTab projectId={project.id} projectStatus={project.status} />
              </TabsContent>
              <TabsContent value="tests">
                <ProjectTestsTab
                  projectId={project.id}
                  onAllApproved={() => {
                    if ((userRole === 'GM' || userRole === 'SUPERADMIN') && project.status === 'ACTIVE') {
                      toast({
                        title: 'All tests approved!',
                        description: 'Every test has been approved. You can now close the project.',
                      });
                    }
                  }}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {showPDF && (
        <ProjectPDFExport
          project={project}
          onClose={() => setShowPDF(false)}
        />
      )}

      <AssignProjectDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        projectId={project.id}
        projectNumber={project.project_number}
        currentAssignment={assignedSupervisor}
        onSuccess={fetchProject}
      />

      {/* AI Report dialog */}
      <Dialog open={!!reportMarkdown} onOpenChange={open => { if (!open) setReportMarkdown(null); }}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>AI Commissioning Report — {project.project_number}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-2 pr-2">
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{reportMarkdown}</pre>
          </ScrollArea>
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => {
              if (!reportMarkdown) return;
              const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${project.project_number}-ai-report.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="h-4 w-4 mr-2" />
              Download .md
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
