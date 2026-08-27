import { useQuery } from '@tanstack/react-query';
import { Check, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatInr } from '@/lib/format';
import { featureLabel } from '@testflow/shared';

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price_inr: number | null;
  annual_price_inr: number | null;
  max_users: number | null;
  max_active_projects: number | null;
  is_custom: boolean;
};

type FeatureRow = { plan_id: string; feature_key: string; enabled: boolean };

type Props = {
  /** Slug of the company's current plan, badged in the header row. */
  currentPlanSlug?: string;
};

function limit(value: number | null): string {
  return value === null ? 'Unlimited' : String(value);
}

function price(value: number | null, suffix: string): string {
  return value === null ? 'Custom' : `${formatInr(value)}${suffix}`;
}

/**
 * The same plan/feature grid the marketing pricing page shows, rendered in the
 * app's own theme. It exists so a SUPERADMIN can see what each tier actually
 * includes without leaving the billing page for the public site — the decision
 * to pay should not require a second tab.
 *
 * Reads `plans` and `plan_features` directly: both are anon-readable by design
 * (the marketing page reads them unauthenticated), and reading the same rows is
 * what keeps in-app and advertised pricing from drifting.
 */
export function PlanComparisonCard({ currentPlanSlug }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['plan-comparison'],
    queryFn: async () => {
      const [plansRes, featuresRes] = await Promise.all([
        supabase
          .from('plans')
          .select('id, slug, name, description, monthly_price_inr, annual_price_inr, max_users, max_active_projects, is_custom')
          .eq('is_public', true)
          .eq('is_active', true)
          .order('monthly_price_inr', { ascending: true, nullsFirst: false }),
        supabase.from('plan_features').select('plan_id, feature_key, enabled'),
      ]);
      if (plansRes.error) throw plansRes.error;
      // A features failure degrades to a price/limit-only table rather than
      // failing the whole card — the prices are the part that must show.
      return {
        plans: (plansRes.data ?? []) as PlanRow[],
        features: (featuresRes.error ? [] : featuresRes.data ?? []) as FeatureRow[],
      };
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const plans = data?.plans ?? [];
  if (plans.length === 0) return null;

  const features = data?.features ?? [];
  const featureKeys = Array.from(new Set(features.map(f => f.feature_key)));
  const isEnabled = (planId: string, key: string) =>
    features.find(f => f.plan_id === planId && f.feature_key === key)?.enabled ?? false;

  const rows: Array<{ label: string; render: (plan: PlanRow) => React.ReactNode }> = [
    { label: 'Monthly', render: p => price(p.monthly_price_inr, '/mo') },
    { label: 'Annual', render: p => price(p.annual_price_inr, '/yr') },
    { label: 'Users', render: p => limit(p.max_users) },
    { label: 'Active projects', render: p => limit(p.max_active_projects) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compare plans</CardTitle>
        <CardDescription>
          What each plan includes. Prices exclude taxes; annual is billed once for the year.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Plan</th>
                {plans.map(p => (
                  <th key={p.id} className="py-2 px-3 text-center font-medium min-w-[7rem]">
                    <span className={p.slug === currentPlanSlug ? 'text-primary' : ''}>{p.name}</span>
                    {p.slug === currentPlanSlug && (
                      <span className="block text-xs font-normal text-primary">Current</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} className="border-b">
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.label}</td>
                  {plans.map(p => (
                    <td key={p.id} className="py-2.5 px-3 text-center tabular-nums">{row.render(p)}</td>
                  ))}
                </tr>
              ))}
              {featureKeys.map(key => (
                <tr key={key} className="border-b last:border-0">
                  <td className="py-2.5 pr-4 text-muted-foreground">{featureLabel(key)}</td>
                  {plans.map(p => (
                    <td key={p.id} className="py-2.5 px-3 text-center">
                      {isEnabled(p.id, key) ? (
                        <Check aria-label="Included" className="h-4 w-4 text-primary inline" />
                      ) : (
                        <Minus aria-label="Not included" className="h-4 w-4 text-muted-foreground/40 inline" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
