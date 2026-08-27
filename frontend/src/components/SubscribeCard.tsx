import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseFunctionsErrorBody } from '@/lib/functionsError';
import { captureException } from '@/lib/monitoring';
import {
  annualSavingPct,
  formatPlanPrice,
  planOptionLabel,
  type BillingInterval,
  type PlanOption,
} from '@/lib/planOptions';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // A <script> left over from a FAILED attempt will never fire load/error
    // again, so attaching listeners to it would hang the retry forever.
    // window.Razorpay is undefined at this point, so any existing tag either
    // failed or is still in flight — dropping it and re-adding is safe and
    // makes "try again" actually retry.
    document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`)?.remove();

    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve();
      else reject(new Error('Razorpay checkout loaded but did not initialise'));
    };
    script.onerror = () => reject(new Error(
      'Failed to load Razorpay checkout — this is usually a Content-Security-Policy or network block.',
    ));
    document.body.appendChild(script);
  });
}

type Props = {
  planOptions: PlanOption[];
  companyName?: string;
  userEmail?: string;
  onSubscribed: () => void;
};

export function SubscribeCard({ planOptions, companyName, userEmail, onSubscribed }: Props) {
  const { toast } = useToast();
  const [targetSlug, setTargetSlug] = useState(planOptions[0]?.slug ?? '');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [subscribing, setSubscribing] = useState(false);

  const selectedPlan = planOptions.find(p => p.slug === targetSlug);
  const selectedPrice = selectedPlan ? formatPlanPrice(selectedPlan, billingInterval) : null;
  const savingPct = selectedPlan ? annualSavingPct(selectedPlan) : null;

  const handleSubscribe = async () => {
    if (!targetSlug) return;
    setSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'subscribe', target_plan_slug: targetSlug, billing_interval: billingInterval },
      });
      const effectiveData = error ? await parseFunctionsErrorBody(error) : data;
      if (!effectiveData || !effectiveData.subscription_id) {
        throw new Error((effectiveData?.error as string) ?? error?.message ?? 'Failed to start checkout');
      }

      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error('Razorpay checkout failed to load');

      const checkout = new window.Razorpay({
        key: effectiveData.razorpay_key_id,
        subscription_id: effectiveData.subscription_id,
        name: 'TestFlow',
        description: `${effectiveData.plan_name} subscription`,
        prefill: { name: companyName, email: userEmail },
        handler: () => {
          toast({
            title: 'Payment received',
            description: 'Your subscription is being activated — this can take a few seconds.',
          });
          onSubscribed();
        },
        modal: {
          ondismiss: () => setSubscribing(false),
        },
      });
      checkout.open();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      captureException(err, { where: 'SubscribeCard.handleSubscribe', targetSlug, billingInterval }, 'payment_failure');
      toast({ title: 'Checkout failed', description: message, variant: 'destructive' });
      setSubscribing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscribe</CardTitle>
        <CardDescription>
          You're on a trial with no active subscription yet — subscribe to keep access after it ends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subscribe-plan">Plan</Label>
          <select
            id="subscribe-plan"
            value={targetSlug}
            onChange={e => setTargetSlug(e.target.value)}
            disabled={subscribing}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
          >
            {planOptions.map(p => (
              <option key={p.slug} value={p.slug}>{planOptionLabel(p, billingInterval)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subscribe-interval">Billing</Label>
          <select
            id="subscribe-interval"
            value={billingInterval}
            onChange={e => setBillingInterval(e.target.value as 'monthly' | 'annual')}
            disabled={subscribing}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual{savingPct !== null ? ` — save ${savingPct}%` : ''}</option>
          </select>
        </div>
        </div>
        {selectedPlan && (
          <p className="text-sm text-muted-foreground">
            {selectedPrice
              ? <>You'll be charged <span className="font-medium text-foreground">{selectedPrice}</span> for {selectedPlan.name}, starting today.</>
              : <>{selectedPlan.name} is priced per contract — talk to sales to get set up.</>}
          </p>
        )}
        <Button onClick={handleSubscribe} disabled={subscribing || !targetSlug}>
          {subscribing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Subscribe
        </Button>
      </CardContent>
    </Card>
  );
}
