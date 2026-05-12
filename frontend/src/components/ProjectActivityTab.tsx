import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Activity } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

interface AuditEntry {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
  created_at: string;
  actor_name?: string;
}

function actionLabel(entry: AuditEntry): string {
  const action = entry.action.toLowerCase();
  const type = entry.entity_type.toLowerCase().replace(/_/g, ' ');
  if (action === 'insert') return `Created ${type}`;
  if (action === 'update') {
    // Try to surface what changed
    if (entry.before_data && entry.after_data) {
      const changed = Object.keys(entry.after_data).filter(
        k => JSON.stringify(entry.after_data![k]) !== JSON.stringify(entry.before_data![k])
      );
      if (changed.includes('status')) {
        return `Status changed: ${entry.before_data.status} → ${entry.after_data.status}`;
      }
      if (changed.includes('assigned_to')) {
        return `Manager assigned`;
      }
      if (changed.length > 0) {
        return `Updated ${type} (${changed.join(', ')})`;
      }
    }
    return `Updated ${type}`;
  }
  if (action === 'delete') return `Deleted ${type}`;
  return `${entry.action} on ${type}`;
}

function dot(entry: AuditEntry) {
  const action = entry.action.toLowerCase();
  if (action === 'insert') return 'bg-success';
  if (action === 'delete') return 'bg-destructive';
  const before = entry.before_data?.status;
  const after = entry.after_data?.status;
  if (after === 'REWORK' || after === 'CLOSED') return 'bg-destructive';
  if (after === 'APPROVED' || after === 'ACTIVE') return 'bg-success';
  if (before !== after) return 'bg-warning';
  return 'bg-primary';
}

interface Props {
  projectId: string;
}

export function ProjectActivityTab({ projectId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // Fetch logs for this project entity directly
        const { data: direct } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('entity_id', projectId)
          .order('created_at', { ascending: false })
          .limit(100);

        // Fetch actor names
        const allEntries = (direct ?? []) as AuditEntry[];
        const actorIds = [...new Set(allEntries.map(e => e.actor_id).filter(Boolean))] as string[];

        if (actorIds.length) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', actorIds);

          const nameMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.name]));
          allEntries.forEach(e => {
            if (e.actor_id) e.actor_name = nameMap[e.actor_id] ?? 'Unknown';
          });
        }

        setEntries(allEntries);
      } catch (err) {
        console.error('Error fetching activity log:', err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
        <p className="text-sm text-muted-foreground">No activity recorded for this project yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-4 bottom-4 w-px bg-border" />

      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-4 pb-5 relative">
          {/* Dot */}
          <div className={`mt-0.5 h-3 w-3 rounded-full flex-shrink-0 z-10 ring-2 ring-background ${dot(entry)}`} />
          <div className="flex-1 min-w-0 pt-0">
            <p className="text-sm font-medium text-foreground leading-snug">{actionLabel(entry)}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {entry.actor_name && (
                <span className="text-xs text-muted-foreground">{entry.actor_name}</span>
              )}
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{formatDateTime(entry.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
