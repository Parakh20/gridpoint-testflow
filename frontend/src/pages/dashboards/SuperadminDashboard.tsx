import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserManagementTable } from '@/components/UserManagementTable';
import { AuditLogViewer } from '@/components/AuditLogViewer';
import { MetricCard } from '@/components/MetricCard';
import { EmptyState } from '@/components/EmptyState';
import { Users, Shield, Activity, UserCheck, CheckCircle2, XCircle, Loader2, RefreshCw, AlertCircle, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useFeature } from '@/lib/features';
import { useToast } from '@/hooks/use-toast';

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

interface PendingUser {
  id: string;
  name: string;
  email: string;
}

function OAuthPendingQueue() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const { data: pending = [], isLoading } = useQuery<PendingUser[]>({
    queryKey: ['oauth-pending-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('oauth_pending', true)
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as PendingUser[];
    },
    refetchInterval: 30_000,
  });

  const act = async (userId: string, action: 'approve' | 'reject') => {
    setBusy(b => ({ ...b, [userId]: true }));
    try {
      if (action === 'approve') {
        const role = roles[userId] ?? 'ENGINEER';
        const { error } = await supabase.rpc('approve_oauth_user', { _user_id: userId, _role: role });
        if (error) throw error;
        toast({ title: 'User approved', description: `Assigned as ${role}` });
      } else {
        const { error } = await supabase.rpc('reject_oauth_user', { _user_id: userId });
        if (error) throw error;
        toast({ title: 'User rejected' });
      }
      qc.invalidateQueries({ queryKey: ['oauth-pending-users'] });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: e.message });
    } finally {
      setBusy(b => ({ ...b, [userId]: false }));
    }
  };

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (pending.length === 0) return (
    <EmptyState title="No pending approvals." />
  );

  return (
    <div className="space-y-3">
      {pending.map(u => (
        <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3 gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={roles[u.id] ?? 'ENGINEER'}
              onValueChange={v => setRoles(r => ({ ...r, [u.id]: v }))}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENGINEER">Engineer</SelectItem>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="GM">GM</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8"
              disabled={!!busy[u.id]}
              onClick={() => act(u.id, 'approve')}
            >
              {busy[u.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!!busy[u.id]}
              onClick={() => act(u.id, 'reject')}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
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
  const canViewAuditLog = useFeature('audit_log_viewer');
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
    { title: 'Total Users', value: totalUsers, icon: <Users className="h-4 w-4 text-muted-foreground" /> },
    { title: 'Active Users', value: stats?.activeUsers || 0, icon: <UserCheck className="h-4 w-4 text-primary" /> },
    { title: 'Active Projects', value: stats?.activeProjects || 0, icon: <Activity className="h-4 w-4 text-accent" /> },
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
            {statsLoading ? (
              <Skeleton className="h-[88px] w-full rounded-lg" />
            ) : (
              <MetricCard label={card.title} value={card.value} icon={card.icon} />
            )}
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
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <CardTitle>Google Sign-In Approvals</CardTitle>
          </div>
          <CardDescription>Employees who signed in with Google and are awaiting role assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <OAuthPendingQueue />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Create and manage user accounts, assign roles</CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable onUserCountChange={setTotalUsers} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>Append-only history of changes across your company</CardDescription>
        </CardHeader>
        <CardContent>
          {canViewAuditLog && <AuditLogViewer />}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
