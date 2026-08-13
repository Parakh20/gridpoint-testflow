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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseDowngradeFeasibility, type DowngradeFeasibility, type DowngradeFeasibilityRpcResponse } from '@testflow/shared';
import { parseFunctionsErrorBody } from '@/lib/functionsError';

type PlanOption = { slug: string; name: string };

type Props = {
  currentPlanName: string;
  planOptions: PlanOption[];
  onChanged: () => void;
};

export function SubscriptionActions({ currentPlanName, planOptions, onChanged }: Props) {
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [targetSlug, setTargetSlug] = useState(planOptions[0]?.slug ?? '');
  const [downgrading, setDowngrading] = useState(false);
  const [feasibility, setFeasibility] = useState<DowngradeFeasibility | null>(null);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'cancel' },
      });
      if (error) throw error;
      toast({
        title: 'Cancellation scheduled',
        description: `Your ${currentPlanName} plan stays active until ${new Date(data.cancel_at).toLocaleDateString()}.`,
      });
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      toast({ title: 'Cancellation failed', description: message, variant: 'destructive' });
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleDowngrade = async () => {
    setDowngrading(true);
    setFeasibility(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'downgrade', target_plan_slug: targetSlug },
      });
      // supabase-js throws on any non-2xx — a 409 "blockers" response is
      // still valid data for this flow, just delivered via error.context.
      const effectiveData = error ? await parseFunctionsErrorBody(error) : data;
      if (!effectiveData) throw error ?? new Error('Failed to schedule downgrade');
      const parsed = parseDowngradeFeasibility(effectiveData as unknown as DowngradeFeasibilityRpcResponse);
      setFeasibility(parsed);
      if (parsed.allowed) {
        toast({ title: 'Downgrade scheduled', description: 'It takes effect at the start of your next billing period.' });
        onChanged();
        setShowDowngradeDialog(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to schedule downgrade';
      toast({ title: 'Downgrade failed', description: message, variant: 'destructive' });
    } finally {
      setDowngrading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
          Cancel Subscription
        </Button>
        {planOptions.length > 0 && (
          <Button variant="outline" onClick={() => { setFeasibility(null); setShowDowngradeDialog(true); }}>
            Change Plan
          </Button>
        )}
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Your {currentPlanName} plan will remain active until the end of the current billing period. You won't be charged again after that.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling...</> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDowngradeDialog} onOpenChange={o => { if (!downgrading) setShowDowngradeDialog(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Downgrades take effect at the start of your next billing period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="target-plan">New plan</Label>
            <select
              id="target-plan"
              value={targetSlug}
              onChange={e => setTargetSlug(e.target.value)}
              disabled={downgrading}
              className="w-full border rounded-md px-3 py-2"
            >
              {planOptions.map(p => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
            {feasibility && !feasibility.allowed && (
              <div className="text-sm text-destructive space-y-1">
                <p>Reduce the following before this downgrade can take effect:</p>
                <ul className="list-disc pl-5">
                  {feasibility.blockers.map(b => (
                    <li key={b.resource}>
                      {b.resource === 'users' ? 'Active users' : 'Active projects'}: {b.current} / {b.targetLimit} allowed
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDowngradeDialog(false)} disabled={downgrading}>Cancel</Button>
            <Button onClick={handleDowngrade} disabled={downgrading || !targetSlug}>
              {downgrading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
