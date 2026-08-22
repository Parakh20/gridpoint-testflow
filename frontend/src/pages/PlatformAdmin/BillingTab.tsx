import { useEffect, useRef, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatInr } from '@/lib/format';
import { platformFetch } from './platformFetch';
import { SubscriptionDetailDrawer } from './SubscriptionDetailDrawer';
import { Subscription, BillingOverview, SubscriptionStatus } from './billingTypes';

const STATUS_BADGE: Record<SubscriptionStatus, string> = {
  trialing: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  paused: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  past_due: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  cancelled: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
  expired: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
};

export function BillingTab({ active }: { active: boolean }) {
  const { toast } = useToast();
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [overviewData, subsData] = await Promise.all([
        platformFetch('get_billing_overview'),
        platformFetch('get_all_subscriptions'),
      ]);
      setOverview(overviewData as BillingOverview);
      setSubs((subsData.subscriptions ?? []) as Subscription[]);
    } catch (err: any) {
      console.error('[Billing] fetch error:', err);
      toast({ variant: 'destructive', title: 'Failed to load billing data', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active && !loadedOnce.current) {
      loadedOnce.current = true;
      fetchAll();
    }
  }, [active]);

  const openDrawer = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {overview && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">MRR</div>
            <div className="text-2xl font-semibold">{formatInr(overview.mrr)}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">ARR</div>
            <div className="text-2xl font-semibold">{formatInr(overview.arr)}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">Active / Trialing</div>
            <div className="text-2xl font-semibold">{overview.active_count} / {overview.trialing_count}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">Past due / Cancelled</div>
            <div className="text-2xl font-semibold">{overview.past_due_count} / {overview.cancelled_count}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renewal</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Projects</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => openDrawer(s.company_id)}>
                <TableCell>{s.companies?.name ?? '—'}</TableCell>
                <TableCell>{s.plans?.name ?? '—'}</TableCell>
                <TableCell><Badge className={STATUS_BADGE[s.status]}>{s.status}</Badge></TableCell>
                <TableCell>{s.current_period_end ? formatDate(s.current_period_end) : '—'}</TableCell>
                <TableCell>{s.plans?.max_users ?? 'Unlimited'}</TableCell>
                <TableCell>{s.plans?.max_active_projects ?? 'Unlimited'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <SubscriptionDetailDrawer
        companyId={selectedCompanyId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onChanged={fetchAll}
      />
    </div>
  );
}
