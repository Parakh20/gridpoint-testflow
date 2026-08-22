import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { platformFetch } from './platformFetch';
import { Subscription, BillingAuditLog, ACTION_LABEL, EnterpriseContract, SubscriptionAddon } from './billingTypes';
import { EnterpriseContractsPanel } from './EnterpriseContractsPanel';
import { SubscriptionAddonsPanel } from './SubscriptionAddonsPanel';

interface Props {
  companyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function SubscriptionDetailDrawer({ companyId, open, onOpenChange, onChanged }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [auditLog, setAuditLog] = useState<BillingAuditLog[]>([]);
  const [contract, setContract] = useState<EnterpriseContract | null>(null);
  const [addons, setAddons] = useState<SubscriptionAddon[]>([]);
  const [acting, setActing] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [creditsInput, setCreditsInput] = useState('');
  const [trialDaysInput, setTrialDaysInput] = useState('7');

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [detail, extras] = await Promise.all([
        platformFetch('get_subscription_detail', { company_id: companyId }),
        platformFetch('get_billing_extras', { company_id: companyId }),
      ]);
      setSub(detail.subscription as Subscription);
      setAuditLog((detail.audit_log ?? []) as BillingAuditLog[]);
      setContract((extras.contract ?? null) as EnterpriseContract | null);
      setAddons((extras.addons ?? []) as SubscriptionAddon[]);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load subscription', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && companyId) {
      load();
    }
  }, [open, companyId]);

  const runAction = async (action: string, actionPayload: Record<string, unknown>, successMsg: string) => {
    if (!companyId) return;
    setActing(true);
    try {
      await platformFetch(action, { company_id: companyId, actor: 'platform-admin', ...actionPayload });
      toast({ title: successMsg });
      onChanged();
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message });
    } finally {
      setActing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{sub?.companies?.name ?? 'Subscription'}</SheetTitle>
        </SheetHeader>

        {loading || !sub ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2">
              <Badge>{sub.status}</Badge>
              <span className="text-sm text-muted-foreground">{sub.plans?.name ?? 'No plan'}</span>
            </div>

            <div className="space-y-2">
              <Label>Apply discount (%)</Label>
              <div className="flex gap-2">
                <Input value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0-100" />
                <Button disabled={acting} onClick={() => runAction('admin_apply_discount', { discount_pct: Number(discountInput) }, 'Discount applied')}>
                  Apply
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Add credits (INR)</Label>
              <div className="flex gap-2">
                <Input value={creditsInput} onChange={(e) => setCreditsInput(e.target.value)} placeholder="Amount" />
                <Button disabled={acting} onClick={() => runAction('admin_add_credits', { amount_inr: Number(creditsInput) }, 'Credits added')}>
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Extend trial (days)</Label>
              <div className="flex gap-2">
                <Input value={trialDaysInput} onChange={(e) => setTrialDaysInput(e.target.value)} placeholder="7" />
                <Button disabled={acting} onClick={() => runAction('admin_extend_trial', { additional_days: Number(trialDaysInput) }, 'Trial extended')}>
                  Extend
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              {/* admin_suspend_account/admin_reactivate_account toggle
                  companies.is_active, not subscriptions.status — derive the
                  button from that, not the subscription status, or a
                  suspended-but-still-"active"-status tenant shows Suspend
                  again with no way to reactivate. */}
              {sub.companies?.is_active === false ? (
                <Button variant="outline" disabled={acting} onClick={() => runAction('admin_reactivate_account', {}, 'Account reactivated')}>
                  Reactivate
                </Button>
              ) : (
                <Button variant="destructive" disabled={acting} onClick={() => runAction('admin_suspend_account', {}, 'Account suspended')}>
                  Suspend
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Audit log</Label>
              <div className="space-y-2 text-sm">
                {auditLog.length === 0 && <div className="text-muted-foreground">No actions recorded yet.</div>}
                {auditLog.map((log) => (
                  <div key={log.id} className="border-b pb-2">
                    <div className="font-medium">{ACTION_LABEL[log.action]}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(log.created_at)} · {log.actor}</div>
                  </div>
                ))}
              </div>
            </div>

            <EnterpriseContractsPanel companyId={companyId as string} contract={contract} onChanged={load} />
            <SubscriptionAddonsPanel companyId={companyId as string} addons={addons} onChanged={load} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
