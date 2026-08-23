import { useEffect, useRef, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatInr } from '@/lib/format';
import { platformFetch } from './platformFetch';
import { PlanEditorDrawer } from './PlanEditorDrawer';
import { AdminPlan, PlanCatalog } from './planTypes';

const price = (v: number | null) => (v == null ? '—' : formatInr(Number(v)));
const cap = (v: number | null) => (v == null ? 'Unlimited' : String(v));

export function PlansTab({ active }: { active: boolean }) {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);

  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = (await platformFetch('get_plan_catalog')) as PlanCatalog;
      setCatalog(data);
      // Keep the open drawer pointed at the refreshed row — feature toggles and
      // provider remaps re-fetch, and a stale `editing` object would show the
      // pre-change state (and a drift warning that was just resolved).
      setEditing((cur) => (cur ? data.plans.find((p) => p.id === cur.id) ?? null : null));
    } catch (err: any) {
      console.error('[Plans] fetch error:', err);
      toast({ variant: 'destructive', title: 'Failed to load plans', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active && !loadedOnce.current) {
      loadedOnce.current = true;
      fetchCatalog();
    }
  }, [active]);

  const plans = catalog?.plans ?? [];
  const driftedPlans = plans.filter((p) => p.price_drift.monthly || p.price_drift.annual);
  const mismatchedPlans = plans.filter((p) => p.mode_mismatch);

  const openEditor = (plan: AdminPlan | null) => {
    setEditing(plan);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {catalog?.provider_configured
            ? <>Razorpay key is in <strong>{catalog.provider_mode}</strong> mode.</>
            : 'Razorpay keys are not configured on this project.'}
        </div>
        <Button size="sm" onClick={() => openEditor(null)}>
          <Plus className="mr-2 h-3.5 w-3.5" /> New plan
        </Button>
      </div>

      {driftedPlans.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {driftedPlans.length} plan(s) advertise a price Razorpay does not charge
          </AlertTitle>
          <AlertDescription className="text-xs">
            {driftedPlans.map((p) => p.name).join(', ')} — the pricing page shows one
            amount while checkout bills the amount the mapped Razorpay plan was created
            at. Open the plan and create replacement Razorpay plans to close the gap.
          </AlertDescription>
        </Alert>
      )}

      {mismatchedPlans.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{mismatchedPlans.length} plan(s) mapped to the wrong Razorpay mode</AlertTitle>
          <AlertDescription className="text-xs">
            {mismatchedPlans.map((p) => p.name).join(', ')} — checkout will fail until
            these are re-created with the current key.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Monthly</TableHead>
              <TableHead>Annual</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Subs</TableHead>
              <TableHead>State</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => openEditor(p)}>
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
                </TableCell>
                <TableCell>
                  {price(p.monthly_price_inr)}
                  {p.price_drift.monthly && <Badge variant="destructive" className="ml-2">drift</Badge>}
                </TableCell>
                <TableCell>
                  {price(p.annual_price_inr)}
                  {p.price_drift.annual && <Badge variant="destructive" className="ml-2">drift</Badge>}
                </TableCell>
                <TableCell>{cap(p.max_users)}</TableCell>
                <TableCell>{cap(p.max_active_projects)}</TableCell>
                <TableCell>{p.subscription_count}</TableCell>
                <TableCell className="space-x-1">
                  {!p.is_active && <Badge variant="secondary">inactive</Badge>}
                  {p.is_active && !p.is_public && <Badge variant="secondary">hidden</Badge>}
                  {p.is_custom && <Badge variant="outline">custom</Badge>}
                  {p.mode_mismatch && <Badge variant="destructive">mode</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="text-xs text-muted-foreground">
        Plans cannot be deleted — subscriptions reference them and entitlement
        resolution falls back to specific slugs. Deactivate instead.
      </p>

      <PlanEditorDrawer
        plan={editing}
        open={drawerOpen}
        featureKeys={catalog?.feature_keys ?? []}
        providerMode={catalog?.provider_mode ?? null}
        providerConfigured={catalog?.provider_configured ?? false}
        onOpenChange={setDrawerOpen}
        onChanged={fetchCatalog}
      />
    </div>
  );
}
