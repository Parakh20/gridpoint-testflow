import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionActions } from '@/components/SubscriptionActions';
import { SubscribeCard } from '@/components/SubscribeCard';
import { InvoiceHistoryCard } from '@/components/InvoiceHistoryCard';
import { ProgressBar } from '@/components/ProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useEntitlements } from '@/lib/entitlements';
import { useUsage } from '@/lib/usage';

export default function BillingSettingsPage() {
  const { entitlements, isLoading: entitlementsLoading } = useEntitlements();
  const { usage, isLoading: usageLoading } = useUsage();
  const { user } = useAuth();
  const { company } = useCompany();

  // A company with no Razorpay subscription on file yet (still on trial,
  // never completed checkout) gets the Subscribe flow instead of the
  // upgrade/downgrade/cancel actions, which all assume a provider
  // subscription already exists.
  const { data: hasProviderSubscription, isLoading: subLoading } = useQuery({
    queryKey: ['has-provider-subscription', company?.id],
    queryFn: async () => {
      if (!company) return false;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('provider_subscription_id')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return !!data?.provider_subscription_id;
    },
    enabled: !!company,
  });

  const { data: subscribePlanOptions = [] } = useQuery({
    queryKey: ['subscribe-plan-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('slug, name')
        .eq('is_public', true)
        .eq('is_active', true)
        .eq('is_custom', false)
        .order('monthly_price_inr', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map(p => ({ slug: p.slug, name: p.name }));
    },
    enabled: hasProviderSubscription === false,
  });

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

  // Higher-priced public, non-custom plans than the current one —
  // check_plan_upgrade_eligibility (server-side) is the real enforcement;
  // this list keeps the dropdown from offering an ineligible target.
  const { data: upgradeOptions = [] } = useQuery({
    queryKey: ['upgrade-plan-options', entitlements?.planSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('slug, name, monthly_price_inr, is_custom')
        .eq('is_public', true)
        .eq('is_active', true)
        .eq('is_custom', false)
        .order('monthly_price_inr', { ascending: true, nullsFirst: false });
      if (error) throw error;

      const current = (data ?? []).find(p => p.slug === entitlements?.planSlug);
      const currentPrice = current?.monthly_price_inr ?? null;

      return (data ?? [])
        .filter(p => p.slug !== entitlements?.planSlug && p.monthly_price_inr !== null)
        .filter(p => currentPrice !== null && (p.monthly_price_inr as number) > currentPrice)
        .map(p => ({ slug: p.slug, name: p.name }));
    },
    enabled: !!entitlements?.planSlug,
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
                    : hasProviderSubscription
                      ? 'Your active subscription.'
                      : 'No paid subscription yet.'}
                </CardDescription>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  hasProviderSubscription
                    ? 'bg-primary/10 text-primary'
                    : 'bg-amber-500/10 text-amber-500'
                }`}
              >
                {hasProviderSubscription ? 'Active' : 'Trial'}
              </span>
            </div>
          </CardHeader>
          {hasProviderSubscription && (
            <CardContent>
              <SubscriptionActions
                currentPlanName={entitlements?.planName ?? 'your current plan'}
                planOptions={downgradeOptions}
                upgradeOptions={upgradeOptions}
                onChanged={() => window.location.reload()}
              />
            </CardContent>
          )}
        </Card>

        {!hasProviderSubscription && subscribePlanOptions.length > 0 && (
          <SubscribeCard
            planOptions={subscribePlanOptions}
            companyName={company?.name}
            userEmail={user?.email}
            onSubscribed={() => window.location.reload()}
          />
        )}

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
