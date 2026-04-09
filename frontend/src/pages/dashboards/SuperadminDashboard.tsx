import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserManagementTable } from '@/components/UserManagementTable';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Users, Shield, Activity, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

export default function SuperadminDashboard() {
  const [totalUsers, setTotalUsers] = useState(0);

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
      <div className="grid gap-6 md:grid-cols-4">
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
              <Shield className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">Healthy</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
