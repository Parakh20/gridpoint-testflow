import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2, ArrowLeft, Printer, UserCheck } from 'lucide-react';
import { ProjectStatusActions } from '@/components/ProjectStatusActions';
import { ProjectScopeTab } from '@/components/ProjectScopeTab';
import { ProjectTestingScopeTab } from '@/components/ProjectTestingScopeTab';
import { ProjectEquipmentTab } from '@/components/ProjectEquipmentTab';
import { ProjectTestsTab } from '@/components/ProjectTestsTab';
import { ProjectPDFExport } from '@/components/ProjectPDFExport';
import { AssignProjectDialog } from '@/components/AssignProjectDialog';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  project_number: string;
  site_name: string;
  site_address: string;
  client: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  assigned_to: string | null;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPDF, setShowPDF] = useState(false);
  const [hasEquipment, setHasEquipment] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignedSupervisor, setAssignedSupervisor] = useState<{ id: string; name: string } | null>(null);

  const fetchProject = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);

      // Check if equipment exists
      const { data: equipmentData } = await supabase
        .from('equipment_instances')
        .select('id')
        .eq('project_id', id)
        .limit(1);

      setHasEquipment(equipmentData && equipmentData.length > 0);

      // Fetch assigned supervisor if exists
      if (data.assigned_to) {
        const { data: supervisorData } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', data.assigned_to)
          .single();

        if (supervisorData) {
          setAssignedSupervisor(supervisorData);
        }
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
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleStatusChange = () => {
    fetchProject();
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
          <Button onClick={() => navigate('/gm')} className="mt-4">
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
                onClick={() => navigate('/gm')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <h2 className="text-2xl font-bold">{project.project_number}</h2>
              <StatusBadge status={project.status} />
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
            <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
              <UserCheck className="h-4 w-4 mr-2" />
              {assignedSupervisor ? 'Reassign' : 'Assign'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPDF(true)}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print PDF
            </Button>
            <ProjectStatusActions
              project={project}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className={`grid w-full ${hasEquipment ? 'grid-cols-5' : 'grid-cols-3'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scope">Scope</TabsTrigger>
            <TabsTrigger value="testing-scope">Testing Scope</TabsTrigger>
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
                    <p className="text-base">
                      {project.start_date
                        ? new Date(project.start_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">End Date</p>
                    <p className="text-base">
                      {project.end_date
                        ? new Date(project.end_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-base">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
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

          {hasEquipment && (
            <>
              <TabsContent value="equipment">
                <ProjectEquipmentTab projectId={project.id} projectStatus={project.status} />
              </TabsContent>

              <TabsContent value="tests">
                <ProjectTestsTab projectId={project.id} />
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
    </DashboardLayout>
  );
}
