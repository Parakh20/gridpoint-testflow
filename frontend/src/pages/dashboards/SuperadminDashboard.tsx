import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserManagementTable } from '@/components/UserManagementTable';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Users, Shield, Activity, UserCheck, CheckCircle2, XCircle, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ServiceStatus = 'ok' | 'error' | 'checking';

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latency?: number;
  detail?: string;
}

async function checkDatabase(): Promise<ServiceCheck> {
  const t = Date.now();
  try {
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    if (error) throw error;
    return { name: 'Database', status: 'ok', latency: Date.now() - t, detail: 'Postgres reachable' };
  } catch (e: any) {
    return { name: 'Database', status: 'error', detail: e.message ?? 'Unreachable' };
  }
}

async function checkAuth(): Promise<ServiceCheck> {
  const t = Date.now();
  try {
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    return { name: 'Auth', status: 'ok', latency: Date.now() - t, detail: 'Auth service responding' };
  } catch (e: any) {
    return { name: 'Auth', status: 'error', detail: e.message ?? 'Unreachable' };
  }
}

async function checkEdgeFunction(name: string): Promise<ServiceCheck> {
  const t = Date.now();
  try {
    const { error } = await supabase.functions.invoke(name, {
      body: { action: '__healthcheck__' },
    });
    // A 400 (unknown action) means the function is running — that's fine
    const reachable = !error || error.message?.includes('non-2xx') === false
      || error.context?.status < 500;
    if (!reachable) throw new Error(error?.message ?? 'Function error');
    return { name, status: 'ok', latency: Date.now() - t, detail: 'Function running' };
  } catch (e: any) {
    return { name, status: 'error', detail: e.message ?? 'Unreachable' };
  }
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  if (status === 'checking') return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

function ServiceRow({ svc }: { svc: ServiceCheck }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <StatusIcon status={svc.status} />
        <span className="text-sm font-medium">{svc.name}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {svc.status === 'ok' && svc.latency !== undefined && (
          <span className={cn(svc.latency > 1000 ? 'text-yellow-500' : 'text-green-500')}>
            {svc.latency}ms
          </span>
        )}
        {svc.status === 'error' && (
          <span className="text-destructive truncate max-w-[160px]">{svc.detail}</span>
        )}
        {svc.status === 'ok' && (
          <span className="text-green-500">Operational</span>
        )}
      </div>
    </div>
  );
}

export default function SuperadminDashboard() {
  const [totalUsers, setTotalUsers] = useState(0);

  const { data: health, isLoading: healthLoading, isFetching: healthFetching, refetch: refetchHealth, dataUpdatedAt } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const results = await Promise.all([
        checkDatabase(),
        checkAuth(),
        checkEdgeFunction('create-user'),
        checkEdgeFunction('generate-report'),
        checkEdgeFunction('platform-admin-data'),
      ]);
      return results;
    },
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const allOk = health?.every(s => s.status === 'ok');
  const anyError = health?.some(s => s.status === 'error');
  const overallStatus = !health ? 'checking' : anyError ? 'error' : allOk ? 'ok' : 'checking';
  const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: async () => {
      const [activeUsersRes, activeProjectsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('projects').select('id', { count: 'exact' }).eq('status', 'ACTIVE'),
      ]);

      return {
        activeUsers: activeUsersRes.count || 0,
        activeProjects: activeProjectsRes.count || 0,
      };
    },
  });

  const statCards = [
    { title: 'Total Users', value: totalUsers, label: 'All registered users', icon: <Users className="h-4 w-4 text-muted-foreground" />, color: '' },
    { title: 'Active Users', value: stats?.activeUsers || 0, label: 'Currently active accounts', icon: <UserCheck className="h-4 w-4 text-primary" />, color: 'text-primary' },
    { title: 'Active Projects', value: stats?.activeProjects || 0, label: 'Currently running', icon: <Activity className="h-4 w-4 text-accent" />, color: 'text-accent' },
  ];

  return (
    <DashboardLayout title="Superadmin Dashboard">
      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className={`text-2xl font-bold ${card.color}`}>
                      <AnimatedCounter value={card.value} />
                    </div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.21 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Shield className={cn('h-4 w-4', overallStatus === 'ok' ? 'text-green-500' : overallStatus === 'error' ? 'text-destructive' : 'text-muted-foreground')} />
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className={cn('text-2xl font-bold', overallStatus === 'ok' ? 'text-green-500' : overallStatus === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                  {overallStatus === 'ok' ? 'Healthy' : overallStatus === 'error' ? 'Degraded' : 'Checking…'}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {lastChecked ? `Last checked ${lastChecked}` : 'Checking services…'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.28 }}
      >
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Service Status
              </CardTitle>
              <CardDescription className="mt-1">Live health checks — refreshes every 30 seconds</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchHealth()}
              disabled={healthFetching}
              className="h-8 w-8"
            >
              <RefreshCw className={cn('h-4 w-4', healthFetching && 'animate-spin')} />
            </Button>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            ) : health ? (
              <div className="divide-y divide-border">
                {health.map(svc => <ServiceRow key={svc.name} svc={svc} />)}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Could not run health checks
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Create and manage user accounts, assign roles</CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable onUserCountChange={setTotalUsers} />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
