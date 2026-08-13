import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { UpgradeReason } from '@testflow/shared';

const RESOURCE_LABEL: Record<UpgradeReason['resource'], string> = {
  users: 'active users',
  projects: 'active projects',
};

interface UpgradeModalProps {
  reason: UpgradeReason | null;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ reason, onOpenChange }: UpgradeModalProps) {
  const { data: targetPlan } = useQuery({
    queryKey: ['plan-by-slug', reason?.required_plan],
    queryFn: async () => {
      if (!reason?.required_plan) return null;
      const { data, error } = await supabase
        .from('plans')
        .select('slug, name, monthly_price_inr')
        .eq('slug', reason.required_plan)
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!reason?.required_plan,
  });

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
          <Button asChild>
            {/* /pricing has no route on the tenant host — the pricing
                section lives on the marketing site, forced via the
                ?marketing query override (App.tsx) regardless of which
                host this modal is rendered on. */}
            <a href="/?marketing#pricing">View plans</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
