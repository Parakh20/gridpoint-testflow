import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/EmptyState';
import { platformFetch } from './platformFetch';
import { LeadDetailDrawer } from './LeadDetailDrawer';
import { SelfServeSignupsPanel } from './SelfServeSignupsPanel';
import { OutreachQueuePanel } from './OutreachQueuePanel';
import { OutreachDraftsPanel } from './OutreachDraftsPanel';
import { Lead, LeadStage, LEAD_STAGES, STAGE_LABEL } from './leadTypes';

const STAGE_BADGE: Record<LeadStage, string> = {
  NEW: 'bg-muted text-muted-foreground',
  CONTACTED: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  DEMO_BOOKED: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  PILOT: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  WON: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  LOST: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  PARKED: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export function SalesTab({ active }: { active: boolean }) {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);

  // filters
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // add-lead dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPriority, setNewPriority] = useState('3');
  const [newSegment, setNewSegment] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await platformFetch('get_all_leads');
      setLeads((data.leads ?? []) as Lead[]);
    } catch (err: any) {
      console.error('[Sales] get_all_leads error:', err);
      toast({ variant: 'destructive', title: 'Failed to load leads', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Lazy-load on first activation of the tab.
  useEffect(() => {
    if (active && !loadedOnce.current) {
      loadedOnce.current = true;
      fetchLeads();
    }
  }, [active]);

  // Client-side filtering (the full list is small — ~88 rows).
  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (stageFilter !== 'ALL' && l.stage !== stageFilter) return false;
      if (priorityFilter !== 'ALL' && String(l.priority ?? '') !== priorityFilter) return false;
      if (search && !l.company_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [leads, stageFilter, priorityFilter, search]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of leads) counts[l.stage] = (counts[l.stage] ?? 0) + 1;
    return counts;
  }, [leads]);

  const openLead = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const handleAddLead = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await platformFetch('create_lead', {
        fields: {
          company_name: newName.trim(),
          priority: Number(newPriority),
          segment: newSegment.trim() || null,
          region: newRegion.trim() || null,
        },
      });
      toast({ title: 'Lead added', description: newName.trim() });
      setAddOpen(false);
      setNewName(''); setNewSegment(''); setNewRegion(''); setNewPriority('3');
      fetchLeads();
    } catch (err: any) {
      console.error('[Sales] create_lead error:', err);
      toast({ variant: 'destructive', title: 'Failed to add lead', description: err.message });
    } finally {
      setAdding(false);
    }
  };

  const today = todayISO();

  return (
    <div className="space-y-5">
      {/* Count-by-stage strip */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStageFilter('ALL')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-sm transition-colors',
            stageFilter === 'ALL' ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          All <span className="font-mono">{leads.length}</span>
        </button>
        {LEAD_STAGES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStageFilter(s)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm transition-colors',
              stageFilter === s ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {STAGE_LABEL[s]} <span className="font-mono">{stageCounts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* The day's work, above the pipeline view: which leads to contact now,
          rather than what the pipeline looks like in aggregate. */}
      {!loading && leads.length > 0 && (
        <OutreachQueuePanel leads={leads} onChanged={fetchLeads} onOpenLead={openLead} />
      )}

      {/* Written mail waiting to go out. Above the queue's follow-up view because
          a first send is the thing that has to happen before anything else can. */}
      {!loading && <OutreachDraftsPanel onSent={fetchLeads} />}

      {/* Companies that signed up with no lead behind them. Rendered above the
          filters because it is a gap in the pipeline, not another view of it. */}
      {!loading && <SelfServeSignupsPanel leads={leads} onLinked={fetchLeads} />}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies…"
            className="pl-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All priorities</SelectItem>
            {[5, 4, 3, 2, 1].map(p => (
              <SelectItem key={p} value={String(p)}>Priority {p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add lead
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card/60 backdrop-blur overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title={leads.length === 0 ? 'No leads yet.' : 'No leads match your filters.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Company</TableHead>
                <TableHead className="text-muted-foreground">Pri</TableHead>
                <TableHead className="text-muted-foreground">Stage</TableHead>
                <TableHead className="text-muted-foreground">Region</TableHead>
                <TableHead className="text-muted-foreground">Touches</TableHead>
                <TableHead className="text-muted-foreground">Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(l => {
                const overdue = l.next_action_date != null && l.next_action_date <= today
                  && l.stage !== 'WON' && l.stage !== 'LOST';
                return (
                  <TableRow
                    key={l.id}
                    className="border-border cursor-pointer"
                    onClick={() => openLead(l.id)}
                  >
                    <TableCell className="font-medium text-foreground">{l.company_name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{l.priority ?? '—'}</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STAGE_BADGE[l.stage])}>
                        {STAGE_LABEL[l.stage]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.region ?? '—'}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{l.activity_count ?? 0}</TableCell>
                    <TableCell>
                      {l.next_action_date ? (
                        <span className={cn(
                          'inline-flex items-center gap-1',
                          overdue ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-muted-foreground'
                        )}>
                          {overdue && <AlertCircle className="h-3.5 w-3.5" />}
                          {formatDate(l.next_action_date)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <LeadDetailDrawer
        leadId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onLeadChanged={fetchLeads}
      />

      {/* Add lead dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add lead</DialogTitle>
            <DialogDescription>Create a new outreach target.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Company name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Acme Power Co" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Input value={newRegion} onChange={e => setNewRegion(e.target.value)} placeholder="Chennai" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Segment</Label>
              <Input value={newSegment} onChange={e => setNewSegment(e.target.value)} placeholder="Pure T&C contractor" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={adding || !newName.trim()} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
