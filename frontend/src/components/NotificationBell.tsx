import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateTime } from '@/lib/format';

interface Notification {
  id: string;
  label: string;
  project_number: string;
  equipment_label: string;
  template_name: string;
  status: string;
  updated_at: string;
}

export function NotificationBell() {
  const { user, userRole } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    if (!user || (userRole !== 'SUPERVISOR' && userRole !== 'ENGINEER')) return;

    if (userRole === 'SUPERVISOR') {
      // 1. Get projects assigned to this supervisor
      const { data: projects } = await supabase
        .from('projects')
        .select('id, project_number')
        .eq('assigned_to', user.id);

      const projectIds = (projects ?? []).map(p => p.id);
      if (!projectIds.length) { setNotifications([]); return; }

      // 2. Get equipment instance IDs in those projects
      const { data: instances } = await supabase
        .from('equipment_instances')
        .select('id, label, project_id')
        .in('project_id', projectIds);

      const instanceIds = (instances ?? []).map(i => i.id);
      if (!instanceIds.length) { setNotifications([]); return; }

      // 3. Get SUBMITTED test tasks for those instances
      const { data: tasks } = await supabase
        .from('test_tasks')
        .select('id, updated_at, equipment_instance_id, test_templates(name)')
        .eq('status', 'SUBMITTED')
        .in('equipment_instance_id', instanceIds)
        .order('updated_at', { ascending: false })
        .limit(20);

      const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p.project_number]));
      const instanceMap = Object.fromEntries((instances ?? []).map(i => [i.id, { label: i.label, project_id: i.project_id }]));

      setNotifications((tasks ?? []).map((t: any) => {
        const inst = instanceMap[t.equipment_instance_id];
        return {
          id: t.id,
          label: 'Test submitted for review',
          project_number: inst ? projectMap[inst.project_id] ?? '' : '',
          equipment_label: inst?.label ?? '',
          template_name: t.test_templates?.name ?? '',
          status: 'SUBMITTED',
          updated_at: t.updated_at,
        };
      }));

    } else {
      // Engineer: REWORK tasks on instances assigned to them
      const { data: instances } = await supabase
        .from('equipment_instances')
        .select('id, label, project_id')
        .eq('assigned_to', user.id);

      const instanceIds = (instances ?? []).map(i => i.id);
      if (!instanceIds.length) { setNotifications([]); return; }

      const projectIds = [...new Set((instances ?? []).map(i => i.project_id))];
      const { data: projects } = await supabase
        .from('projects')
        .select('id, project_number')
        .in('id', projectIds);

      const { data: tasks } = await supabase
        .from('test_tasks')
        .select('id, updated_at, equipment_instance_id, test_templates(name)')
        .eq('status', 'REWORK')
        .in('equipment_instance_id', instanceIds)
        .order('updated_at', { ascending: false })
        .limit(20);

      const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p.project_number]));
      const instanceMap = Object.fromEntries((instances ?? []).map(i => [i.id, { label: i.label, project_id: i.project_id }]));

      setNotifications((tasks ?? []).map((t: any) => {
        const inst = instanceMap[t.equipment_instance_id];
        return {
          id: t.id,
          label: 'Test needs rework',
          project_number: inst ? projectMap[inst.project_id] ?? '' : '',
          equipment_label: inst?.label ?? '',
          template_name: t.test_templates?.name ?? '',
          status: 'REWORK',
          updated_at: t.updated_at,
        };
      }));
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notification-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'test_tasks' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, userRole]);

  if (userRole !== 'SUPERVISOR' && userRole !== 'ENGINEER') return null;

  const count = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={`${count} notifications`}
        >
          <Bell size={16} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground leading-none">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="right">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 && (
            <p className="text-xs text-muted-foreground">{count} item{count !== 1 ? 's' : ''} need attention</p>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {count === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell size={24} className="mx-auto text-muted-foreground mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">All caught up</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.status === 'REWORK' ? 'bg-destructive' : 'bg-warning'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {n.project_number}{n.equipment_label ? ` · ${n.equipment_label}` : ''}{n.template_name ? ` · ${n.template_name}` : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(n.updated_at)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
