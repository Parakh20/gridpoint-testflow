import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

const PAGE_SIZE = 50;

interface AuditRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  action: string;
  table_name: string;
  record_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

interface ProfileLite {
  id: string;
  name: string;
  email: string;
}

export function AuditLogViewer() {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', tableFilter, actionFilter],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('id, created_at, actor_id, action, table_name, record_id, before, after')
        .order('created_at', { ascending: false })
        .limit(500);
      if (tableFilter !== 'all') q = q.eq('table_name', tableFilter);
      if (actionFilter !== 'all') q = q.eq('action', actionFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data as AuditRow[]) ?? [];
    },
  });

  // Hydrate actor names from profiles
  const actorIds = [...new Set(logs.map(l => l.actor_id).filter(Boolean))] as string[];
  const { data: profiles = [] } = useQuery({
    queryKey: ['audit-actor-profiles', actorIds.join(',')],
    queryFn: async () => {
      if (!actorIds.length) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', actorIds);
      if (error) throw error;
      return (data as ProfileLite[]) ?? [];
    },
    enabled: actorIds.length > 0,
  });
  const actorMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const actor = l.actor_id ? actorMap[l.actor_id] : null;
    return (
      l.table_name.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.record_id.toLowerCase().includes(q) ||
      (actor?.name?.toLowerCase().includes(q) ?? false) ||
      (actor?.email?.toLowerCase().includes(q) ?? false)
    );
  });

  const visibleLogs = filteredLogs.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actor, table, action…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 w-64"
          />
        </div>

        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Table" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tables</SelectItem>
            <SelectItem value="projects">projects</SelectItem>
            <SelectItem value="equipment_instances">equipment_instances</SelectItem>
            <SelectItem value="test_tasks">test_tasks</SelectItem>
            <SelectItem value="test_records">test_records</SelectItem>
            <SelectItem value="user_roles">user_roles</SelectItem>
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {isLoading ? 'Loading…' : `${filteredLogs.length} of ${logs.length} entries`}
        </span>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Record</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : visibleLogs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No audit entries match.</TableCell></TableRow>
            ) : (
              visibleLogs.map(log => {
                const expanded = expandedRow === log.id;
                const actor = log.actor_id ? actorMap[log.actor_id] : null;
                return (
                  <Fragment key={log.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpandedRow(expanded ? null : log.id)}>
                      <TableCell>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-mono text-xs">{formatDateTime(log.created_at)}</TableCell>
                      <TableCell>{actor ? <span><span className="font-medium">{actor.name}</span> <span className="text-xs text-muted-foreground">{actor.email}</span></span> : <span className="text-muted-foreground">system</span>}</TableCell>
                      <TableCell>
                        <span className={
                          log.action === 'DELETE' ? 'text-destructive font-mono text-xs' :
                          log.action === 'INSERT' ? 'text-emerald-500 font-mono text-xs' :
                          'text-amber-500 font-mono text-xs'
                        }>{log.action}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.table_name}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]">{log.record_id}</TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6}>
                          <div className="grid grid-cols-2 gap-4 p-2 text-xs">
                            <div>
                              <div className="font-semibold mb-1 text-muted-foreground">Before</div>
                              <pre className="bg-background border rounded p-2 overflow-auto max-h-60">{log.before ? JSON.stringify(log.before, null, 2) : '—'}</pre>
                            </div>
                            <div>
                              <div className="font-semibold mb-1 text-muted-foreground">After</div>
                              <pre className="bg-background border rounded p-2 overflow-auto max-h-60">{log.after ? JSON.stringify(log.after, null, 2) : '—'}</pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filteredLogs.length > visibleCount && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, filteredLogs.length - visibleCount)} more
          </Button>
        </div>
      )}
    </div>
  );
}
