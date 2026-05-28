import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';

interface Workload {
  projects_created: number;
  projects_assigned: number;
  equipment_assigned: number;
  test_tasks_assigned: number;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

interface OffboardUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; name: string; email: string } | null;
  onSuccess: () => void;
}

export function OffboardUserDialog({ open, onOpenChange, user, onSuccess }: OffboardUserDialogProps) {
  const [transferToId, setTransferToId] = useState<string>('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (open) setTransferToId('');
  }, [open]);

  const { data: workload } = useQuery({
    queryKey: ['user-workload', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('user_workload_summary', { _user_id: user.id });
      if (error) throw error;
      return data as unknown as Workload;
    },
    enabled: !!user && open,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ['offboard-candidates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, is_active')
        .neq('id', user.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data as Profile[]) ?? [];
    },
    enabled: !!user && open,
  });

  const hasWork =
    !!workload &&
    (workload.projects_created > 0 ||
      workload.projects_assigned > 0 ||
      workload.equipment_assigned > 0 ||
      workload.test_tasks_assigned > 0);

  const handleConfirm = async () => {
    if (!user) return;
    if (hasWork && !transferToId) {
      toast.error('Please pick someone to transfer the work to.');
      return;
    }

    setRunning(true);
    try {
      if (hasWork) {
        const { data, error } = await supabase.rpc('offboard_user', {
          _from_user: user.id,
          _to_user: transferToId,
        });
        if (error) throw error;
        const r = data as Record<string, number>;
        toast.success('User offboarded', {
          description: `Transferred ${r.transferred_projects} projects, ${r.transferred_assignments} assignments, ${r.transferred_equipment} equipment, ${r.transferred_tasks} tasks.`,
        });
      } else {
        // No work to transfer — just deactivate
        const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', user.id);
        if (error) throw error;
        toast.success('User deactivated');
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Offboard failed';
      toast.error('Offboard failed', { description: message });
    } finally {
      setRunning(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={o => { if (!running) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offboard {user.name}</DialogTitle>
          <DialogDescription>
            Deactivates this user so they can no longer sign in. Their account and audit history are preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {workload && (
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <div className="font-medium">Current workload</div>
              <ul className="text-muted-foreground space-y-0.5">
                <li>Projects created: <span className="text-foreground font-medium">{workload.projects_created}</span></li>
                <li>Projects assigned: <span className="text-foreground font-medium">{workload.projects_assigned}</span></li>
                <li>Equipment assigned: <span className="text-foreground font-medium">{workload.equipment_assigned}</span></li>
                <li>Test tasks assigned: <span className="text-foreground font-medium">{workload.test_tasks_assigned}</span></li>
              </ul>
            </div>
          )}

          {hasWork && (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>This user has open work. Transfer ownership before deactivating so nothing is lost.</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Transfer ownership to</label>
                <Select value={transferToId} onValueChange={setTransferToId} disabled={running}>
                  <SelectTrigger><SelectValue placeholder="Pick a user…" /></SelectTrigger>
                  <SelectContent>
                    {candidates.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={running || (hasWork && !transferToId)}>
            {running && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {hasWork ? 'Transfer & Deactivate' : 'Deactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
