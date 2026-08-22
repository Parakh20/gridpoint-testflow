import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseFunctionsErrorBody } from '@/lib/functionsError';
import { captureException } from '@/lib/monitoring';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout')));
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

type PlanOption = { slug: string; name: string };

type Props = {
  planOptions: PlanOption[];
  companyName?: string;
  userEmail?: string;
  onSubscribed: () => void;
};

export function SubscribeCard({ planOptions, companyName, userEmail, onSubscribed }: Props) {
  const { toast } = useToast();
  const [targetSlug, setTargetSlug] = useState(planOptions[0]?.slug ?? '');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [subscribing, setSubscribing] = useState(false);

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
        <CardDescription>Choose a plan to start your paid subscription.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subscribe-plan">Plan</Label>
          <select
            id="subscribe-plan"
            value={targetSlug}
            onChange={e => setTargetSlug(e.target.value)}
            disabled={subscribing}
            className="w-full border rounded-md px-3 py-2"
          >
            {planOptions.map(p => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
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
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <Button onClick={handleSubscribe} disabled={subscribing || !targetSlug}>
          {subscribing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Subscribe
        </Button>
      </CardContent>
    </Card>
  );
}
