import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseFunctionsErrorBody } from '@/lib/functionsError';
import { captureException } from '@/lib/monitoring';
import type { UpgradeReason } from '@testflow/shared';

const RESOURCE_LABEL: Record<UpgradeReason['resource'], string> = {
  users: 'active users',
  projects: 'active projects',
};

interface UpgradeModalProps {
  reason: UpgradeReason | null;
  onOpenChange: (open: boolean) => void;
  onUpgraded?: () => void;
}

export function UpgradeModal({ reason, onOpenChange, onUpgraded }: UpgradeModalProps) {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  const { data: targetPlan } = useQuery({
    queryKey: ['plan-by-slug', reason?.required_plan],
    queryFn: async () => {
      if (!reason?.required_plan) return null;
      const { data, error } = await supabase
        .from('plans')
        .select('slug, name, monthly_price_inr, is_custom')
        .eq('slug', reason.required_plan)
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!reason?.required_plan,
  });

  const handleUpgradeNow = async () => {
    if (!targetPlan) return;
    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'upgrade', target_plan_slug: targetPlan.slug },
      });
      const effectiveData = error ? await parseFunctionsErrorBody(error) : data;
      if (!effectiveData?.upgraded) throw new Error((effectiveData?.reason as string) ?? 'Failed to upgrade plan');
      toast({ title: 'Plan upgraded', description: 'Your new plan is active immediately.' });
      onUpgraded?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upgrade plan';
      captureException(err, { where: 'UpgradeModal.handleUpgradeNow' }, 'payment_failure');
      toast({ title: 'Upgrade failed', description: message, variant: 'destructive' });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Dialog open={!!reason} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan limit reached</DialogTitle>
          <DialogDescription>
            {reason && (
              <>
                Your current plan allows {reason.limit} {RESOURCE_LABEL[reason.resource]}
                {reason.current !== null ? ` (${reason.current} in use)` : ''}.
                {targetPlan && (
                  <>
                    {' '}Upgrade to <strong>{targetPlan.name}</strong>
                    {targetPlan.monthly_price_inr ? ` (₹${targetPlan.monthly_price_inr.toLocaleString('en-IN')}/mo)` : ''} to add more.
                  </>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {targetPlan && !targetPlan.is_custom ? (
            <Button onClick={handleUpgradeNow} disabled={upgrading}>
              {upgrading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upgrade now
            </Button>
          ) : (
            <Button asChild>
              {/* /pricing has no route on the tenant host — the pricing
                  section lives on the marketing site, forced via the
                  ?marketing query override (App.tsx) regardless of which
                  host this modal is rendered on. */}
              <a href="/?marketing#pricing">View plans</a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
