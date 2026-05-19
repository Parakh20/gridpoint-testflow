import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SubStatus =
  | 'trialing'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'cancelled'
  | 'expired';

interface SubscriptionRow {
  status: SubStatus;
  current_period_end: string | null;
}

interface CompanyTrial {
  trial_ends_at: string | null;
}

/**
 * Shows a banner near the top of dashboards when:
 *   - Tenant is still in their trial → days-remaining countdown
 *   - Trial has expired and there's no active subscription
 *   - Subscription status is past_due / paused
 *
 * Hidden once subscription.status = 'active'.
 */
export function TrialBanner() {
  const { user } = useAuth();
  const { company } = useCompany();

  const { data } = useQuery({
    queryKey: ['trial-banner', user?.id, company?.id],
    queryFn: async () => {
      if (!company) return null;
      const [{ data: companyRow }, { data: subRow }] = await Promise.all([
        supabase.from('companies').select('trial_ends_at').eq('id', company.id).single() as unknown as Promise<{ data: CompanyTrial | null }>,
        supabase.from('subscriptions').select('status, current_period_end').eq('company_id', company.id).maybeSingle() as unknown as Promise<{ data: SubscriptionRow | null }>,
      ]);
      return { company: companyRow, subscription: subRow };
    },
    enabled: !!user && !!company,
    staleTime: 5 * 60 * 1000,
  });

  if (!data || !user) return null;
  const sub = data.subscription;
  const trialEndsAt = data.company?.trial_ends_at ? new Date(data.company.trial_ends_at) : null;
  const now = new Date();

  // Active paid customer → no banner
  if (sub?.status === 'active') return null;

  // Past due / paused → urgent
  if (sub && (sub.status === 'past_due' || sub.status === 'paused' || sub.status === 'expired' || sub.status === 'cancelled')) {
    return (
      <Banner severity="urgent">
        <span>
          Your subscription is <strong>{sub.status}</strong>. Some features may be limited.
        </span>
      </Banner>
    );
  }

  // Trial mode
  if (trialEndsAt) {
    const msLeft = trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

    if (daysLeft <= 0) {
      return (
        <Banner severity="urgent">
          <span>Your trial has ended. Upgrade to continue using TestFlow.</span>
        </Banner>
      );
    }
    if (daysLeft <= 7) {
      return (
        <Banner severity={daysLeft <= 3 ? 'urgent' : 'warning'}>
          <span>
            Trial ends in <strong>{daysLeft} day{daysLeft === 1 ? '' : 's'}</strong>.
          </span>
        </Banner>
      );
    }
  }

  return null;
}

function Banner({
  severity,
  children,
}: {
  severity: 'warning' | 'urgent';
  children: React.ReactNode;
}) {
  const cls =
    severity === 'urgent'
      ? 'bg-destructive/10 border-destructive/30 text-destructive'
      : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400';
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2 text-sm border-b ${cls}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {children}
      </div>
      <Button size="sm" variant="outline" onClick={() => (window.location.href = '/billing')}>
        Manage billing
      </Button>
    </div>
  );
}
