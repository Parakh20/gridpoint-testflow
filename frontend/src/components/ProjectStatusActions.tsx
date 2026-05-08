import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { dashboardPath } from '@/lib/routes';
import { Loader2, CheckCircle, PlayCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProjectStatusActionsProps {
  project: {
    id: string;
    status: string;
    project_number: string;
  };
  onStatusChange: () => void;
  /** Called immediately before the API call — lets the parent update UI optimistically */
  onOptimisticUpdate?: (newStatus: string) => void;
}

export function ProjectStatusActions({ project, onStatusChange, onOptimisticUpdate }: ProjectStatusActionsProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'activate' | 'close' | 'revert' | 'delete'>('approve');

  const updateProjectStatus = async (newStatus: string, additionalFields: Record<string, unknown> = {}) => {
    setLoading(true);
    // Optimistic update — parent can reflect new status in UI immediately
    onOptimisticUpdate?.(newStatus);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus as any, ...additionalFields })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Project ${newStatus.toLowerCase()} successfully`,
      });
      onStatusChange();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowDialog(false);
    }
  };

  const handleApprove = async () => {
    const { data: projectData } = await supabase
      .from('projects')
      .select('assigned_to')
      .eq('id', project.id)
      .single();

    if (!projectData?.assigned_to) {
      toast({
        title: 'Assignment Required',
        description: 'Please assign this project to a supervisor before approving',
        variant: 'destructive',
      });
      setShowDialog(false);
      return;
    }

    await updateProjectStatus('APPROVED', {
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    });
  };

  const handleActivate = async () => {
    const { data: instances } = await supabase
      .from('equipment_instances')
      .select('id')
      .eq('project_id', project.id)
      .limit(1);

    if (!instances?.length) {
      toast({
        title: 'Cannot Activate',
        description: 'Please generate equipment instances before activating the project',
        variant: 'destructive',
      });
      setShowDialog(false);
      return;
    }

    await updateProjectStatus('ACTIVE', {
      start_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleClose = async () => {
    await updateProjectStatus('CLOSED', {
      end_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleRevertToDraft = async () => {
    await updateProjectStatus('DRAFT', {
      approved_at: null,
      approved_by: null,
    });
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Project deleted successfully' });
      navigate(dashboardPath(userRole));
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
    } finally {
      setLoading(false);
      setShowDialog(false);
    }
  };

  const handleDialogConfirm = () => {
    switch (dialogAction) {
      case 'approve':  handleApprove();       break;
      case 'activate': handleActivate();      break;
      case 'close':    handleClose();         break;
      case 'revert':   handleRevertToDraft(); break;
      case 'delete':   handleDelete();        break;
    }
  };

  const openDialog = (action: typeof dialogAction) => {
    setDialogAction(action);
    setShowDialog(true);
  };

  const dialogContent = {
    approve:  { title: 'Approve Test Plan',    description: 'Are you sure you want to approve this test plan? This will allow the project to be activated.' },
    activate: { title: 'Activate Project',     description: 'Are you sure you want to activate this project? Field work can begin after activation.' },
    close:    { title: 'Close Project',        description: 'Are you sure you want to close this project? This action marks the project as completed.' },
    revert:   { title: 'Revert to Draft',      description: 'Are you sure you want to revert this project to draft status? Approval information will be removed.' },
    delete:   { title: 'Delete Project',       description: 'Are you sure you want to delete this project? This action cannot be undone.' },
  }[dialogAction];

  const renderActions = () => {
    switch (project.status) {
      case 'DRAFT':
        return (
          <>
            <Button onClick={() => navigate(`/projects/${project.id}/edit`)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />Edit
            </Button>
            <Button onClick={() => openDialog('approve')} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Approve
            </Button>
            <Button onClick={() => openDialog('delete')} variant="destructive" disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
          </>
        );
      case 'APPROVED':
        return (
          <>
            <Button onClick={() => openDialog('revert')} variant="outline" disabled={loading}>
              Revert to Draft
            </Button>
            <Button onClick={() => navigate(`/projects/${project.id}/edit`)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />Edit
            </Button>
            <Button onClick={() => openDialog('activate')} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
              Activate
            </Button>
          </>
        );
      case 'ACTIVE':
        return (
          <Button onClick={() => openDialog('close')} variant="destructive" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
            Close Project
          </Button>
        );
      case 'CLOSED':
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex gap-2">{renderActions()}</div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDialogConfirm} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
