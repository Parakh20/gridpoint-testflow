import { useEffect, useState } from 'react';
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
import { captureException } from '@/lib/monitoring';

type PlanOption = { slug: string; name: string };

type Props = {
  currentPlanName: string;
  planOptions: PlanOption[];
  upgradeOptions?: PlanOption[];
  onChanged: () => void;
};

export function SubscriptionActions({ currentPlanName, planOptions, upgradeOptions = [], onChanged }: Props) {
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [targetSlug, setTargetSlug] = useState(planOptions[0]?.slug ?? '');
  const [downgrading, setDowngrading] = useState(false);
  const [feasibility, setFeasibility] = useState<DowngradeFeasibility | null>(null);

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeTargetSlug, setUpgradeTargetSlug] = useState(upgradeOptions[0]?.slug ?? '');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeBlockedReason, setUpgradeBlockedReason] = useState<string | null>(null);

  // upgradeOptions arrives from an async query, so the state initializer above
  // runs against an empty list on first render — leaving the <select> with no
  // matching option and Confirm Upgrade permanently disabled until the user
  // manually re-picks. Re-sync whenever the current selection isn't in the
  // list (including the initial empty-string case).
  useEffect(() => {
    if (upgradeOptions.length === 0) return;
    if (upgradeOptions.some(p => p.slug === upgradeTargetSlug)) return;
    setUpgradeTargetSlug(upgradeOptions[0].slug);
  }, [upgradeOptions, upgradeTargetSlug]);

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
      captureException(err, { where: 'SubscriptionActions.handleCancel' }, 'payment_failure');
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
      captureException(err, { where: 'SubscriptionActions.handleDowngrade', targetSlug }, 'payment_failure');
      toast({ title: 'Downgrade failed', description: message, variant: 'destructive' });
    } finally {
      setDowngrading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    setUpgradeBlockedReason(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'upgrade', target_plan_slug: upgradeTargetSlug },
      });
      const effectiveData = error ? await parseFunctionsErrorBody(error) : data;
      if (!effectiveData) throw error ?? new Error('Failed to upgrade plan');
      if (effectiveData.upgraded) {
        toast({ title: 'Plan upgraded', description: 'Your new plan is active immediately.' });
        onChanged();
        setShowUpgradeDialog(false);
      } else if (!('upgraded' in effectiveData) && effectiveData.error) {
        // 500/502 shape from manage-subscription: `{ error }`, not the
        // `{ upgraded: false, reason }` 409 shape. Throw so the catch block's
        // captureException + destructive toast run — a payment failure must
        // not be rendered as an inline "you're not eligible" note.
        throw new Error(effectiveData.error as string);
      } else {
        setUpgradeBlockedReason((effectiveData.reason as string) ?? 'Unable to upgrade to this plan');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upgrade plan';
      captureException(err, { where: 'SubscriptionActions.handleUpgrade', upgradeTargetSlug }, 'payment_failure');
      toast({ title: 'Upgrade failed', description: message, variant: 'destructive' });
    } finally {
      setUpgrading(false);
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
        {upgradeOptions.length > 0 && (
          <Button onClick={() => { setUpgradeBlockedReason(null); setShowUpgradeDialog(true); }}>
            Upgrade Plan
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

      <Dialog open={showUpgradeDialog} onOpenChange={o => { if (!upgrading) setShowUpgradeDialog(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Plan</DialogTitle>
            <DialogDescription>
              Upgrades take effect immediately. Your next invoice will reflect the new plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="upgrade-target-plan">New plan</Label>
            <select
              id="upgrade-target-plan"
              value={upgradeTargetSlug}
              onChange={e => setUpgradeTargetSlug(e.target.value)}
              disabled={upgrading}
              className="w-full border rounded-md px-3 py-2"
            >
              {upgradeOptions.map(p => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
            {upgradeBlockedReason && (
              <p className="text-sm text-destructive">{upgradeBlockedReason}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} disabled={upgrading}>Cancel</Button>
            <Button onClick={handleUpgrade} disabled={upgrading || !upgradeTargetSlug}>
              {upgrading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
