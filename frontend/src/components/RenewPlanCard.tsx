import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { parseFunctionsErrorBody } from '@/lib/functionsError';
import { captureException } from '@/lib/monitoring';
import { loadRazorpayCheckout } from '@/lib/razorpayCheckout';
import {
  annualSavingPct,
  formatPlanPrice,
  planOptionLabel,
  type BillingInterval,
  type PlanOption,
} from '@/lib/planOptions';

type Props = {
  planOptions: PlanOption[];
  /** Slug of the plan the company is on, preselected so renewing as-is is one click. */
  currentPlanSlug?: string;
  currentInterval?: BillingInterval;
  /** End of the paid period, or null while the company has never paid. */
  periodEnd?: string | null;
  isFrozen: boolean;
  companyName?: string;
  userEmail?: string;
  onRenewed: () => void;
};

/**
 * Prepaid renewal. Each period is bought outright as a one-time Razorpay
 * order — there is no mandate and no automatic charge, so this is the only
 * way a period is ever extended.
 *
 * Renewing into a different plan is deliberately the same action as renewing
 * into the same one: with no continuous subscription there is nothing to
 * upgrade or downgrade, the company simply chooses what to buy next.
 */
export function RenewPlanCard({
  planOptions, currentPlanSlug, currentInterval = 'monthly', periodEnd, isFrozen,
  companyName, userEmail, onRenewed,
}: Props) {
  const { toast } = useToast();
  const [targetSlug, setTargetSlug] = useState(currentPlanSlug ?? planOptions[0]?.slug ?? '');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(currentInterval);
  const [renewing, setRenewing] = useState(false);

  const selectedPlan = planOptions.find(p => p.slug === targetSlug);
  const selectedPrice = selectedPlan ? formatPlanPrice(selectedPlan, billingInterval) : null;
  const savingPct = selectedPlan ? annualSavingPct(selectedPlan) : null;
  const isChangingPlan = !!currentPlanSlug && targetSlug !== currentPlanSlug;

  const handleRenew = async () => {
    if (!targetSlug) return;
    setRenewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'renew_plan', target_plan_slug: targetSlug, billing_interval: billingInterval },
      });
      const effectiveData = error ? await parseFunctionsErrorBody(error) : data;
      if (!effectiveData?.order_id) {
        throw new Error((effectiveData?.error as string) ?? error?.message ?? 'Failed to start checkout');
      }

      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error('Razorpay checkout failed to load');

      const checkout = new window.Razorpay({
        key: effectiveData.razorpay_key_id,
        order_id: effectiveData.order_id,
        name: 'TestFlow',
        description: `${effectiveData.plan_name} — ${effectiveData.billing_interval === 'annual' ? '1 year' : '1 month'}`,
        prefill: { name: companyName, email: userEmail },
        handler: () => {
          toast({
            title: 'Payment received',
            description: 'Your plan is being extended — this can take a few seconds.',
          });
          onRenewed();
        },
        modal: { ondismiss: () => setRenewing(false) },
      });
      checkout.open();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      captureException(err, { where: 'RenewPlanCard.handleRenew', targetSlug, billingInterval }, 'payment_failure');
      toast({ title: 'Checkout failed', description: message, variant: 'destructive' });
      setRenewing(false);
    }
  };

  const heading = isFrozen ? 'Renew to unfreeze' : periodEnd ? 'Renew' : 'Choose a plan';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>
          {isFrozen
            ? 'Your paid period has ended, so the workspace is read-only. Renewing restores it immediately.'
            : periodEnd
              ? <>Paid through <span className="font-medium text-foreground">{formatDate(periodEnd)}</span>. Renew any time — days you have already paid for are added on, never lost.</>
              : 'Pay for your first period. There is no autopay: nothing is ever charged automatically.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="renew-plan">Plan</Label>
            <select
              id="renew-plan"
              value={targetSlug}
              onChange={e => setTargetSlug(e.target.value)}
              disabled={renewing}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
            >
              {planOptions.map(p => (
                <option key={p.slug} value={p.slug}>{planOptionLabel(p, billingInterval)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="renew-interval">Period</Label>
            <select
              id="renew-interval"
              value={billingInterval}
              onChange={e => setBillingInterval(e.target.value as BillingInterval)}
              disabled={renewing}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
            >
              <option value="monthly">1 month</option>
              <option value="annual">1 year{savingPct !== null ? ` — save ${savingPct}%` : ''}</option>
            </select>
          </div>
        </div>

        {selectedPlan && (
          <p className="text-sm text-muted-foreground">
            {selectedPrice ? (
              <>
                You'll pay <span className="font-medium text-foreground">{selectedPrice.split('/')[0]}</span> once
                {' '}for {billingInterval === 'annual' ? 'a year' : 'a month'} of {selectedPlan.name}.
                {isChangingPlan && ' Your new plan applies from the moment the payment clears.'}
              </>
            ) : (
              <>{selectedPlan.name} is priced per contract — talk to sales.</>
            )}
          </p>
        )}

        <Button onClick={handleRenew} disabled={renewing || !targetSlug}>
          {renewing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isFrozen ? 'Renew now' : isChangingPlan ? 'Switch plan' : 'Renew'}
        </Button>
      </CardContent>
    </Card>
  );
}
