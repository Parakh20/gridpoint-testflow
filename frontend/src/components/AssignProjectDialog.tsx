import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SupervisorSelector } from './SupervisorSelector';
import { useToast } from '@/hooks/use-toast';
import { UserCheck } from 'lucide-react';

interface AssignProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectNumber: string;
  currentAssignment?: { id: string; name: string } | null;
  onSuccess: () => void;
}

export function AssignProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectNumber,
  currentAssignment,
  onSuccess,
}: AssignProjectDialogProps) {
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSelectedSupervisorId(currentAssignment?.id || null);
    }
  }, [open, currentAssignment]);

  const handleAssign = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ assigned_to: selectedSupervisorId })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Assignment updated',
        description: selectedSupervisorId
          ? `Project ${projectNumber} has been assigned to the supervisor`
          : `Project ${projectNumber} has been unassigned`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Assignment failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isChanged = selectedSupervisorId !== (currentAssignment?.id || null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Assign Project
          </DialogTitle>
          <DialogDescription>
            {currentAssignment
              ? `Currently assigned to ${currentAssignment.name}. Select a new supervisor or unassign.`
              : 'Select a supervisor to assign this project to.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Project: {projectNumber}</p>
          </div>

          <SupervisorSelector
            value={selectedSupervisorId || undefined}
            onChange={setSelectedSupervisorId}
            label="Supervisor"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || !isChanged}>
            {loading ? 'Assigning...' : 'Assign Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
