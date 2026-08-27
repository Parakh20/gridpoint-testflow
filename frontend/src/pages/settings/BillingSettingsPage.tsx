import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RenewPlanCard } from '@/components/RenewPlanCard';
import { InvoiceHistoryCard } from '@/components/InvoiceHistoryCard';
import { PlanComparisonCard } from '@/components/PlanComparisonCard';
import { AddonsCard } from '@/components/AddonsCard';
import { ProgressBar } from '@/components/ProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useEntitlements } from '@/lib/entitlements';
import { useUsage } from '@/lib/usage';
import { type BillingInterval, type PlanOption } from '@/lib/planOptions';
import { formatDate } from '@/lib/format';

/** Shared shape for the plan-picker query below. */
const PLAN_OPTION_COLUMNS = 'slug, name, monthly_price_inr, annual_price_inr';

type PlanRow = {
  slug: string;
  name: string;
  monthly_price_inr: number | null;
  annual_price_inr: number | null;
};

function toPlanOption(p: PlanRow): PlanOption {
  return {
    slug: p.slug,
    name: p.name,
    monthlyPriceInr: p.monthly_price_inr,
    annualPriceInr: p.annual_price_inr,
  };
}

export default function BillingSettingsPage() {
  const { entitlements, isLoading: entitlementsLoading } = useEntitlements();
  const { usage, isLoading: usageLoading } = useUsage();
  const { user } = useAuth();
  const { company } = useCompany();

  // Prepaid model: the paid-through date is the only thing that matters.
  // Past it the workspace is read-only until someone renews.
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription-period', company?.id],
    queryFn: async () => {
      if (!company) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('billing_interval, current_period_end, plan_id')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!company,
  });

  const { data: isFrozen = false } = useQuery({
    queryKey: ['workspace-frozen', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_workspace_frozen', {
        _company_id: company!.id,
      });
      if (error) throw error;
      return !!data;
    },
    enabled: !!company,
  });

  const periodEnd = subscription?.current_period_end ?? null;
  const hasPaidPeriod = !!periodEnd;
  const currentInterval: BillingInterval =
    subscription?.billing_interval === 'annual' ? 'annual' : 'monthly';

  const { data: renewPlanOptions = [] } = useQuery({
    queryKey: ['renew-plan-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select(PLAN_OPTION_COLUMNS)
        .eq('is_public', true)
        .eq('is_active', true)
        .eq('is_custom', false)
        .order('monthly_price_inr', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map(toPlanOption);
    },
  });

  if (entitlementsLoading || usageLoading || subLoading) {
    return (
      <DashboardLayout title="Billing">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Billing">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-page-title">Billing</h2>
          <p className="text-muted-foreground mt-1">Your plan, usage, and upcoming invoices.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{entitlements?.planName ?? 'No plan'}</CardTitle>
                <CardDescription className="mt-1">
                  {entitlements?.isCustom
                    ? 'Custom pricing — contact your account manager for details.'
                    : isFrozen
                      ? 'Your paid period has ended. The workspace is read-only until you renew.'
                      : hasPaidPeriod
                        ? <>Paid through {formatDate(periodEnd)}.</>
                        : 'On trial — no period purchased yet.'}
                </CardDescription>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  isFrozen
                    ? 'bg-destructive/10 text-destructive'
                    : hasPaidPeriod
                      ? 'bg-primary/10 text-primary'
                      : 'bg-amber-500/10 text-amber-500'
                }`}
              >
                {isFrozen ? 'Read-only' : hasPaidPeriod ? 'Active' : 'Trial'}
              </span>
            </div>
          </CardHeader>
        </Card>

        {renewPlanOptions.length > 0 && (
          <RenewPlanCard
            planOptions={renewPlanOptions}
            currentPlanSlug={entitlements?.planSlug}
            currentInterval={currentInterval}
            periodEnd={periodEnd}
            isFrozen={isFrozen}
            companyName={company?.name}
            userEmail={user?.email}
            onRenewed={() => window.location.reload()}
          />
        )}

        <AddonsCard
          companyId={company?.id}
          companyName={company?.name}
          userEmail={user?.email}
          hasSubscription={hasPaidPeriod && !isFrozen}
          onPurchased={() => window.location.reload()}
        />

        <PlanComparisonCard currentPlanSlug={entitlements?.planSlug} />

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Current billing period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {entitlements?.maxUsers == null ? (
              <p className="text-sm text-muted-foreground">Users: {usage?.activeUsers ?? 0} / Unlimited</p>
            ) : (
              <ProgressBar
                value={usage?.activeUsers ? (usage.activeUsers / entitlements.maxUsers) * 100 : 0}
                label={`Users (${usage?.activeUsers ?? 0} / ${entitlements.maxUsers})`}
                tone={(usage?.activeUsers ?? 0) / entitlements.maxUsers > 0.9 ? 'warning' : 'default'}
              />
            )}
            {entitlements?.maxActiveProjects == null ? (
              <p className="text-sm text-muted-foreground">Active projects: {usage?.activeProjects ?? 0} / Unlimited</p>
            ) : (
              <ProgressBar
                value={usage?.activeProjects ? (usage.activeProjects / entitlements.maxActiveProjects) * 100 : 0}
                label={`Active projects (${usage?.activeProjects ?? 0} / ${entitlements.maxActiveProjects})`}
                tone={(usage?.activeProjects ?? 0) / entitlements.maxActiveProjects > 0.9 ? 'warning' : 'default'}
              />
            )}
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">AI reports this month</span>
              <span className="font-medium tabular-nums">{usage?.aiReportsThisMonth ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <InvoiceHistoryCard />
      </div>
    </DashboardLayout>
  );
}
