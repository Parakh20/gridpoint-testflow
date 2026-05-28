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
import { Loader2, CheckCircle, PlayCircle, XCircle, Edit, Trash2, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface ProjectStatusActionsProps {
  project: {
    id: string;
    status: string;
    project_number: string;
    site_name?: string;
    site_address?: string;
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

  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneNumber, setCloneNumber] = useState('');
  const [cloneSiteName, setCloneSiteName] = useState('');
  const [cloneAddress, setCloneAddress] = useState('');

  const openCloneDialog = () => {
    setCloneNumber(`${project.project_number}-COPY`);
    setCloneSiteName(project.site_name ?? '');
    setCloneAddress(project.site_address ?? '');
    setShowCloneDialog(true);
  };

  const handleClone = async () => {
    setCloning(true);
    try {
      const { data: newId, error } = await supabase.rpc('clone_project', {
        _source_project_id: project.id,
        _new_project_number: cloneNumber,
        _new_site_name: cloneSiteName,
        _new_site_address: cloneAddress,
      });
      if (error) throw error;
      toast({ title: 'Project cloned', description: 'Scope and test selections copied. New project is in DRAFT.' });
      setShowCloneDialog(false);
      if (newId) navigate(`/projects/${newId}`);
    } catch (err) {
      console.error('Clone failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to clone project';
      toast({ title: 'Clone failed', description: message, variant: 'destructive' });
    } finally {
      setCloning(false);
    }
  };

  const updateProjectStatus = async (newStatus: string, additionalFields: Record<string, unknown> = {}) => {
    setLoading(true);
    // Optimistic update — parent can reflect new status in UI immediately
    onOptimisticUpdate?.(newStatus);
    try {
      // Optimistic concurrency: guard on the status we read at render-time.
      // If another user transitioned the project in between, our update
      // returns 0 rows and we surface a refresh prompt instead of silently
      // clobbering their change.
      const { data, error } = await supabase
        .from('projects')
        .update({ status: newStatus as any, ...additionalFields })
        .eq('id', project.id)
        .eq('status', project.status as any)
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'Project was modified',
          description: 'Someone else changed this project. Refresh to see the latest status.',
          variant: 'destructive',
        });
        onStatusChange(); // re-fetch so UI re-syncs
        return;
      }

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
        description: 'Please assign this project to a manager before approving',
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

  const canClone = userRole === 'GM' || userRole === 'SUPERADMIN';
  const renderActions = () => {
    switch (project.status) {
      case 'DRAFT':
        return (
          <>
            <Button onClick={() => navigate(`/projects/${project.id}/edit`)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />Edit
            </Button>
            {canClone && (
              <Button onClick={openCloneDialog} variant="outline">
                <Copy className="h-4 w-4 mr-2" />Clone
              </Button>
            )}
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
            {canClone && (
              <Button onClick={openCloneDialog} variant="outline">
                <Copy className="h-4 w-4 mr-2" />Clone
              </Button>
            )}
            <Button onClick={() => openDialog('activate')} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
              Activate
            </Button>
          </>
        );
      case 'ACTIVE':
        return (
          <>
            {canClone && (
              <Button onClick={openCloneDialog} variant="outline">
                <Copy className="h-4 w-4 mr-2" />Clone
              </Button>
            )}
            <Button onClick={() => openDialog('close')} variant="destructive" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Close Project
            </Button>
          </>
        );
      case 'CLOSED':
        return canClone ? (
          <Button onClick={openCloneDialog} variant="outline">
            <Copy className="h-4 w-4 mr-2" />Clone
          </Button>
        ) : null;
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

      <Dialog open={showCloneDialog} onOpenChange={o => { if (!cloning) setShowCloneDialog(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Project</DialogTitle>
            <DialogDescription>
              Creates a new DRAFT project with the same equipment scope and test selections. Equipment instances and test records are NOT copied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="clone-number">New project number</Label>
              <Input id="clone-number" value={cloneNumber} onChange={e => setCloneNumber(e.target.value)} disabled={cloning} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="clone-site">Site name</Label>
              <Input id="clone-site" value={cloneSiteName} onChange={e => setCloneSiteName(e.target.value)} disabled={cloning} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="clone-address">Site address</Label>
              <Input id="clone-address" value={cloneAddress} onChange={e => setCloneAddress(e.target.value)} disabled={cloning} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)} disabled={cloning}>Cancel</Button>
            <Button onClick={handleClone} disabled={cloning || !cloneNumber.trim() || !cloneSiteName.trim() || !cloneAddress.trim()}>
              {cloning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clone Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
