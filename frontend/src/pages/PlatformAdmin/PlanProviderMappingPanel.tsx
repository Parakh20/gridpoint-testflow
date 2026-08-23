import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatInr } from '@/lib/format';
import { platformFetch } from './platformFetch';
import { AdminPlan } from './planTypes';

interface Props {
  plan: AdminPlan;
  providerMode: 'test' | 'live' | null;
  providerConfigured: boolean;
  onChanged: () => void;
}

/**
 * Razorpay plan mapping for one plan.
 *
 * The point of this panel: `plans.monthly_price_inr` is what the pricing page
 * ADVERTISES, while `plan_provider_mapping.razorpay_plan_id_*` is what a new
 * subscriber is actually CHARGED. Razorpay plan amounts are immutable, so
 * editing a price here does not change the charge — it opens a gap between the
 * two. That gap is real money, so it is surfaced as a blocking-looking warning
 * with the one fix that closes it: create a replacement Razorpay plan at the
 * new price and remap.
 */
export function PlanProviderMappingPanel({ plan, providerMode, providerConfigured, onChanged }: Props) {
  const { toast } = useToast();
  const mapping = plan.provider_mapping;
  const [busy, setBusy] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [monthlyId, setMonthlyId] = useState(mapping?.razorpay_plan_id_monthly ?? '');
  const [annualId, setAnnualId] = useState(mapping?.razorpay_plan_id_annual ?? '');

  const drift = plan.price_drift;
  const hasDrift = drift.monthly || drift.annual;
  const unmapped =
    !plan.is_custom &&
    (!mapping || (!mapping.razorpay_plan_id_monthly && !mapping.razorpay_plan_id_annual));

  const createProviderPlans = async () => {
    setBusy(true);
    try {
      const intervals: string[] = [];
      if (plan.monthly_price_inr != null) intervals.push('monthly');
      if (plan.annual_price_inr != null) intervals.push('annual');
      const res = await platformFetch('create_provider_plans', { plan_id: plan.id, intervals, actor: 'platform-admin' });
      toast({
        title: 'Razorpay plans created',
        description: Object.entries(res.created ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · '),
      });
      onChanged();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Razorpay plan creation failed', description: err.message });
    } finally {
      setBusy(false);
      setConfirmCreate(false);
    }
  };

  const saveManual = async () => {
    setBusy(true);
    try {
      await platformFetch('set_plan_provider_mapping', {
        plan_id: plan.id,
        razorpay_plan_id_monthly: monthlyId,
        razorpay_plan_id_annual: annualId,
        actor: 'platform-admin',
      });
      toast({ title: 'Mapping saved' });
      setManualOpen(false);
      onChanged();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to save mapping', description: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (plan.is_custom) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Custom plans are sales-assisted and quoted per contract — no Razorpay plan is mapped.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Razorpay plan mapping</Label>
        {mapping?.provider_mode && (
          <Badge variant={mapping.provider_mode === 'live' ? 'default' : 'secondary'}>
            {mapping.provider_mode} mode
          </Badge>
        )}
      </div>

      {hasDrift && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Advertised price does not match what Razorpay charges</AlertTitle>
          <AlertDescription className="space-y-2">
            <div className="text-xs">
              {drift.monthly && mapping && (
                <div>
                  Monthly: page shows {plan.monthly_price_inr == null ? '—' : formatInr(Number(plan.monthly_price_inr))},
                  Razorpay charges {mapping.monthly_price_inr_at_mapping == null ? 'an unrecorded amount' : formatInr(Number(mapping.monthly_price_inr_at_mapping))}.
                </div>
              )}
              {drift.annual && mapping && (
                <div>
                  Annual: page shows {plan.annual_price_inr == null ? '—' : formatInr(Number(plan.annual_price_inr))},
                  Razorpay charges {mapping.annual_price_inr_at_mapping == null ? 'an unrecorded amount' : formatInr(Number(mapping.annual_price_inr_at_mapping))}.
                </div>
              )}
            </div>
            <div className="text-xs">
              Razorpay plan amounts cannot be edited. Create a replacement plan at the
              new price and remap — existing subscribers stay on their current plan and
              price until they resubscribe.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {plan.mode_mismatch && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Mapped to {mapping?.provider_mode} plans, but the configured key is {providerMode}</AlertTitle>
          <AlertDescription className="text-xs">
            Checkout will fail — a plan id from one Razorpay mode does not exist in the
            other. Re-create these plans with the current key.
          </AlertDescription>
        </Alert>
      )}

      {unmapped && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Razorpay plan mapped</AlertTitle>
          <AlertDescription className="text-xs">
            This plan is listed but cannot be subscribed to — checkout has no provider
            plan id to use.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Monthly plan id</span>
          <span className="font-mono">{mapping?.razorpay_plan_id_monthly ?? '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Annual plan id</span>
          <span className="font-mono">{mapping?.razorpay_plan_id_annual ?? '—'}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || !providerConfigured}
          onClick={() => setConfirmCreate(true)}
        >
          {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Create Razorpay plans at current price
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setManualOpen((v) => !v)}>
          {manualOpen ? 'Cancel' : 'Enter plan ids manually'}
        </Button>
      </div>

      {!providerConfigured && (
        <p className="text-xs text-muted-foreground">
          RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set on the Supabase project, so
          plans cannot be created from here.
        </p>
      )}

      {manualOpen && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Only paste ids for Razorpay plans that were created at this plan's current
            prices — the amounts are recorded against them for drift detection, not read
            back from Razorpay.
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Monthly plan id</Label>
            <Input value={monthlyId} onChange={(e) => setMonthlyId(e.target.value)} placeholder="plan_..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Annual plan id</Label>
            <Input value={annualId} onChange={(e) => setAnnualId(e.target.value)} placeholder="plan_..." />
          </div>
          <Button size="sm" disabled={busy} onClick={saveManual}>Save mapping</Button>
        </div>
      )}

      <AlertDialog open={confirmCreate} onOpenChange={setConfirmCreate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Razorpay plans in {providerMode ?? 'unknown'} mode?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>
                  New Razorpay plans will be created for <strong>{plan.name}</strong> at{' '}
                  {plan.monthly_price_inr == null ? '—' : formatInr(Number(plan.monthly_price_inr))}/month
                  {plan.annual_price_inr != null && <> and {formatInr(Number(plan.annual_price_inr))}/year</>},
                  and this plan will be remapped to them.
                </div>
                <div>
                  This cannot be undone at Razorpay — plans there can never be deleted, only
                  orphaned. The {plan.billable_subscription_count} subscription(s) currently
                  billing on this plan keep their existing plan id and price; only new
                  checkouts use the new one.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); createProviderPlans(); }}>
              Create and remap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
