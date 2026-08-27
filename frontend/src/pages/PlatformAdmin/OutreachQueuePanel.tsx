/**
 * The outreach work queue.
 *
 * The Sales tab answers "what is in the pipeline". This answers the question
 * actually asked every morning: "who do I contact today?" Without it, working
 * the list means opening every lead drawer in turn to read its next-action date,
 * which is why touch logging stops after the first week -- and a half-logged
 * outreach record is worse than none, because a contacted lead reads as
 * untouched and gets mailed twice.
 *
 * Four buckets, in the order they should be worked. Overdue first because a
 * follow-up that slipped is the cheapest reply available; never-contacted last
 * because a new send is the most expensive thing here in reputation terms.
 */
import { useMemo, useState } from 'react';
import { Loader2, AlertCircle, Clock, MailQuestion, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { platformFetch } from './platformFetch';
import {
  LEAD_CHANNELS, LEAD_STAGES, CHANNEL_LABEL, STAGE_LABEL,
  type Lead, type LeadChannel, type LeadStage,
} from './leadTypes';

/** Days of silence after a touch before a lead counts as gone quiet. Matches the
 *  five-to-seven working day follow-up window in OUTREACH_SENDING_PLAN.md. */
const QUIET_AFTER_DAYS = 7;

/** Stages where no further outreach is wanted. */
const CLOSED_STAGES: LeadStage[] = ['WON', 'LOST', 'PARKED'];

type BucketKey = 'overdue' | 'today' | 'quiet' | 'untouched';

interface Bucket {
  key: BucketKey;
  title: string;
  hint: string;
  icon: typeof AlertCircle;
  tone: string;
  leads: Lead[];
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildBuckets(leads: Lead[], today: string): Bucket[] {
  const open = leads.filter(l => !CLOSED_STAGES.includes(l.stage));

  const overdue = open.filter(l => l.next_action_date != null && l.next_action_date < today);
  const dueToday = open.filter(l => l.next_action_date === today);

  // Contacted, no follow-up scheduled, and silent for a week. These are the ones
  // that quietly fall out of a pipeline: nothing is overdue because nothing was
  // ever scheduled.
  const quiet = open.filter(l => {
    if (l.next_action_date != null) return false;
    const since = daysSince(l.last_contacted_at);
    return since != null && since >= QUIET_AFTER_DAYS;
  });

  const untouched = open
    .filter(l => l.last_contacted_at == null && l.next_action_date == null)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return [
    { key: 'overdue', title: 'Overdue', hint: 'Follow-up date has passed', icon: AlertCircle, tone: 'text-rose-600 dark:text-rose-400', leads: overdue },
    { key: 'today', title: 'Due today', hint: 'Scheduled for today', icon: Clock, tone: 'text-amber-600 dark:text-amber-400', leads: dueToday },
    { key: 'quiet', title: 'Gone quiet', hint: `Contacted, no reply, nothing scheduled for ${QUIET_AFTER_DAYS}+ days`, icon: MailQuestion, tone: 'text-sky-600 dark:text-sky-400', leads: quiet },
    { key: 'untouched', title: 'Never contacted', hint: 'Highest priority first', icon: Sparkles, tone: 'text-muted-foreground', leads: untouched },
  ];
}

interface Props {
  leads: Lead[];
  onChanged: () => void;
  onOpenLead: (id: string) => void;
}

export function OutreachQueuePanel({ leads, onChanged, onOpenLead }: Props) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const buckets = useMemo(() => buildBuckets(leads, today), [leads, today]);

  const [target, setTarget] = useState<Lead | null>(null);
  const [channel, setChannel] = useState<LeadChannel>('EMAIL');
  const [body, setBody] = useState('');
  const [nextDate, setNextDate] = useState(isoDaysFromNow(7));
  const [stage, setStage] = useState<LeadStage>('CONTACTED');
  const [saving, setSaving] = useState(false);

  const openLog = (lead: Lead) => {
    setTarget(lead);
    setChannel('EMAIL');
    setBody('');
    setNextDate(isoDaysFromNow(7));
    setStage(lead.stage === 'NEW' ? 'CONTACTED' : lead.stage);
  };

  const submit = async () => {
    if (!target || !body.trim()) return;
    setSaving(true);
    try {
      await platformFetch('log_touch', {
        lead_id: target.id,
        channel,
        body: body.trim(),
        next_action_date: nextDate || null,
        stage,
      });
      toast({ title: 'Touch logged', description: target.company_name });
      setTarget(null);
      onChanged();
    } catch (err) {
      console.error('log_touch failed', err);
      toast({
        title: 'Could not log the touch',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const totalDue = buckets
    .filter(b => b.key !== 'untouched')
    .reduce((n, b) => n + b.leads.length, 0);

  return (
    <section className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-4">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Today's outreach</h3>
          <p className="text-xs text-muted-foreground">
            {totalDue === 0
              ? 'Nothing due. Pick from “Never contacted” below.'
              : `${totalDue} lead${totalDue === 1 ? '' : 's'} need attention.`}
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {buckets.map(bucket => {
          const Icon = bucket.icon;
          const shown = bucket.key === 'untouched' ? bucket.leads.slice(0, 8) : bucket.leads;
          return (
            <div key={bucket.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', bucket.tone)} />
                <span className="text-sm font-medium text-foreground">{bucket.title}</span>
                <span className="font-mono text-xs text-muted-foreground">{bucket.leads.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">{bucket.hint}</p>

              {shown.length === 0 ? (
                <p className="text-xs text-muted-foreground/70 italic">Empty.</p>
              ) : (
                <ul className="space-y-1">
                  {shown.map(lead => {
                    const since = daysSince(lead.last_contacted_at);
                    return (
                      <li
                        key={lead.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenLead(lead.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm text-foreground">{lead.company_name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {lead.next_action_date
                              ? `Due ${formatDate(lead.next_action_date)}`
                              : since != null
                                ? `Last touch ${since}d ago`
                                : `Priority ${lead.priority ?? '—'}`}
                            {lead.tech_stack ? ` · ${lead.tech_stack}` : ''}
                          </span>
                        </button>
                        <Button size="sm" variant="outline" onClick={() => openLog(lead)}>
                          Log
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {bucket.key === 'untouched' && bucket.leads.length > shown.length && (
                <p className="text-xs text-muted-foreground">
                  +{bucket.leads.length - shown.length} more in the table below.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={target != null} onOpenChange={o => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log a touch — {target?.company_name}</DialogTitle>
            <DialogDescription>
              Records the contact and schedules the follow-up in one step, so the
              next action can't be left unset.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Channel</label>
                <Select value={channel} onValueChange={v => setChannel(v as LeadChannel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_CHANNELS.map(c => (
                      <SelectItem key={c} value={c}>{CHANNEL_LABEL[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Stage</label>
                <Select value={stage} onValueChange={v => setStage(v as LeadStage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map(s => (
                      <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">What happened</label>
              <Textarea
                rows={3}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Sent intro email to ravi@akuntha.com, offered a free pilot."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Follow up on</label>
              <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Clear this only if the lead is closed — an unscheduled lead falls out
                of the queue until it has been silent for {QUIET_AFTER_DAYS} days.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !body.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log touch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
