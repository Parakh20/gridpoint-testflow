import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { platformFetch } from './platformFetch';
import { PlanProviderMappingPanel } from './PlanProviderMappingPanel';
import {
  AdminPlan, EMPTY_PLAN_FORM, FEATURE_LABEL, PlanFormValues, planToForm,
} from './planTypes';

interface Props {
  /** null = create a new plan. */
  plan: AdminPlan | null;
  open: boolean;
  featureKeys: string[];
  providerMode: 'test' | 'live' | null;
  providerConfigured: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function PlanEditorDrawer({
  plan, open, featureKeys, providerMode, providerConfigured, onOpenChange, onChanged,
}: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<PlanFormValues>(EMPTY_PLAN_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const isCreate = plan === null;

  useEffect(() => {
    if (!open) return;
    setForm(plan ? planToForm(plan) : EMPTY_PLAN_FORM);
  }, [open, plan]);

  const set = <K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // The price the operator is typing vs the price the mapped Razorpay plan was
  // created at. Shown live so the consequence is visible before saving, not
  // discovered afterwards.
  const mapping = plan?.provider_mapping ?? null;
  const pendingMonthlyDrift =
    !!mapping?.razorpay_plan_id_monthly &&
    Number(form.monthly_price_inr || NaN) !== Number(mapping.monthly_price_inr_at_mapping);
  const pendingAnnualDrift =
    !!mapping?.razorpay_plan_id_annual &&
    Number(form.annual_price_inr || NaN) !== Number(mapping.annual_price_inr_at_mapping);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...(isCreate ? { slug: form.slug } : { plan_id: plan!.id }),
        name: form.name,
        description: form.description || null,
        monthly_price_inr: form.monthly_price_inr,
        annual_price_inr: form.annual_price_inr,
        max_users: form.max_users,
        max_active_projects: form.max_active_projects,
        is_custom: form.is_custom,
        is_active: form.is_active,
        is_public: form.is_public,
        actor: 'platform-admin',
      };
      const res = await platformFetch(isCreate ? 'create_plan' : 'update_plan', payload);
      toast({ title: isCreate ? 'Plan created' : 'Plan saved' });
      if (res?.provider_warning) {
        toast({ variant: 'destructive', title: 'Price now differs from Razorpay', description: res.provider_warning });
      }
      onChanged();
      if (isCreate) onOpenChange(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: isCreate ? 'Create failed' : 'Save failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    if (!plan) return;
    setTogglingKey(featureKey);
    try {
      await platformFetch('set_plan_feature', {
        plan_id: plan.id, feature_key: featureKey, enabled, actor: 'platform-admin',
      });
      onChanged();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Feature toggle failed', description: err.message });
    } finally {
      setTogglingKey(null);
    }
  };

  const featureEnabled = (key: string) =>
    plan?.features.find((f) => f.feature_key === key)?.enabled ?? false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isCreate ? 'New plan' : plan!.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            {isCreate ? (
              <div className="space-y-1">
                <Label htmlFor="plan-slug">Slug</Label>
                <Input
                  id="plan-slug"
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="growth"
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase, hyphen-separated. Permanent — entitlement fallbacks resolve
                  plans by slug, so it cannot be changed later.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Slug</Label>
                <div className="font-mono text-sm text-muted-foreground">{plan!.slug}</div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="plan-name">Name</Label>
              <Input id="plan-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="plan-desc">Description</Label>
              <Textarea id="plan-desc" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="plan-monthly">Monthly price (INR)</Label>
                <Input id="plan-monthly" inputMode="decimal" value={form.monthly_price_inr} onChange={(e) => set('monthly_price_inr', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-annual">Annual price (INR)</Label>
                <Input id="plan-annual" inputMode="decimal" value={form.annual_price_inr} onChange={(e) => set('annual_price_inr', e.target.value)} />
              </div>
            </div>

            {(pendingMonthlyDrift || pendingAnnualDrift) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Saving this price changes only what the pricing page advertises. Razorpay
                  plan amounts are immutable, so new subscribers keep being charged the old
                  amount until you create replacement Razorpay plans below.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="plan-users">Max users</Label>
                <Input id="plan-users" inputMode="numeric" value={form.max_users} onChange={(e) => set('max_users', e.target.value)} placeholder="Unlimited" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-projects">Max active projects</Label>
                <Input id="plan-projects" inputMode="numeric" value={form.max_active_projects} onChange={(e) => set('max_active_projects', e.target.value)} placeholder="Unlimited" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave a cap blank for unlimited.</p>

            <div className="space-y-2">
              {([
                ['is_active', 'Active', 'Inactive plans are hidden everywhere and cannot be subscribed to.'],
                ['is_public', 'Public', 'Public plans appear on the marketing pricing page.'],
                ['is_custom', 'Custom (quote-only)', 'Custom plans skip self-serve checkout and have no Razorpay plan.'],
              ] as const).map(([key, label, hint]) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor={`plan-${key}`}>{label}</Label>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                  <Switch id={`plan-${key}`} checked={form[key]} onCheckedChange={(v) => set(key, v)} />
                </div>
              ))}
            </div>

            <Button disabled={saving} onClick={save}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isCreate ? 'Create plan' : 'Save changes'}
            </Button>
          </div>

          {!isCreate && (
            <>
              <div className="space-y-2">
                <Label>Features</Label>
                <p className="text-xs text-muted-foreground">
                  Applies to every company on this plan immediately. Enterprise contracts
                  and add-ons still override this per company.
                </p>
                <div className="space-y-2">
                  {featureKeys.map((key) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <span className="text-sm">{FEATURE_LABEL[key] ?? key}</span>
                      <Switch
                        aria-label={FEATURE_LABEL[key] ?? key}
                        disabled={togglingKey === key}
                        checked={featureEnabled(key)}
                        onCheckedChange={(v) => toggleFeature(key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <PlanProviderMappingPanel
                plan={plan!}
                providerMode={providerMode}
                providerConfigured={providerConfigured}
                onChanged={onChanged}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
