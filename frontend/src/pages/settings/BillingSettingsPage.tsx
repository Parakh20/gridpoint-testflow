import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntitlements } from '@/lib/entitlements';
import { useUsage } from '@/lib/usage';

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number | null }) {
  const isUnlimited = limit === null;
  const pct = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{current} / {isUnlimited ? 'Unlimited' : limit}</span>
      </div>
      {!isUnlimited && <Progress value={pct} />}
    </div>
  );
}

export default function BillingSettingsPage() {
  const { entitlements, isLoading: entitlementsLoading } = useEntitlements();
  const { usage, isLoading: usageLoading } = useUsage();

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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Current billing period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageBar label="Users" current={usage?.activeUsers ?? 0} limit={entitlements?.maxUsers ?? null} />
            <UsageBar label="Active projects" current={usage?.activeProjects ?? 0} limit={entitlements?.maxActiveProjects ?? null} />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">AI reports this month</span>
              <span className="font-mono">{usage?.aiReportsThisMonth ?? 0}</span>
            </div>
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
