import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionActions } from '@/components/SubscriptionActions';
import { MetricCard } from '@/components/MetricCard';
import { ProgressBar } from '@/components/ProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { useEntitlements } from '@/lib/entitlements';
import { useUsage } from '@/lib/usage';

export default function BillingSettingsPage() {
  const { entitlements, isLoading: entitlementsLoading } = useEntitlements();
  const { usage, isLoading: usageLoading } = useUsage();

  // Lower-priced public plans than the current one — request_plan_downgrade
  // (server-side) is the real enforcement of "must be a downgrade"; this
  // list is just so the dropdown doesn't even offer a same/higher-priced
  // plan in the first place.
  const { data: downgradeOptions = [] } = useQuery({
    queryKey: ['downgrade-plan-options', entitlements?.planSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('slug, name, monthly_price_inr')
        .eq('is_public', true)
        .eq('is_active', true)
        .order('monthly_price_inr', { ascending: true, nullsFirst: false });
      if (error) throw error;

      const current = (data ?? []).find(p => p.slug === entitlements?.planSlug);
      const currentPrice = current?.monthly_price_inr ?? null;

      return (data ?? [])
        .filter(p => p.slug !== entitlements?.planSlug && p.monthly_price_inr !== null)
        .filter(p => currentPrice === null || (p.monthly_price_inr as number) < currentPrice)
        .map(p => ({ slug: p.slug, name: p.name }));
    },
    enabled: !!entitlements?.planSlug,
  });

  if (entitlementsLoading || usageLoading) {
    return (
      <DashboardLayout title="Billing">
        <div className="space-y-4 p-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Billing">
      <div className="space-y-6 p-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Your plan, usage, and upcoming invoices.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{entitlements?.planName ?? 'No plan'}</CardTitle>
            <CardDescription>
              {entitlements?.isCustom
                ? 'Custom pricing — contact your account manager for details.'
                : 'Monthly and annual pricing available on the pricing page.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionActions
              currentPlanName={entitlements?.planName ?? 'your current plan'}
              planOptions={downgradeOptions}
              onChanged={() => window.location.reload()}
            />
          </CardContent>
        </Card>

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
            <MetricCard label="AI reports this month" value={usage?.aiReportsThisMonth ?? 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Invoice history is coming soon.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
