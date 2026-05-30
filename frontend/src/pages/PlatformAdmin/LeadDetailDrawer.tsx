import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ExternalLink, Phone, Mail, Save, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import { platformFetch } from './platformFetch';
import {
  Lead,
  LeadActivity,
  LeadStage,
  LeadChannel,
  LEAD_STAGES,
  LEAD_CHANNELS,
  STAGE_LABEL,
  CHANNEL_LABEL,
} from './leadTypes';

interface LeadDetailDrawerProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadChanged: () => void; // refetch list after edits/activity
}

export function LeadDetailDrawer({ leadId, open, onOpenChange, onLeadChanged }: LeadDetailDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);

  // editable fields
  const [stage, setStage] = useState<LeadStage>('NEW');
  const [nextActionDate, setNextActionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // new activity form
  const [channel, setChannel] = useState<LeadChannel>('WHATSAPP');
  const [activityBody, setActivityBody] = useState('');
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (!open || !leadId) return;
    let cancelled = false;
    setLoading(true);
    setLead(null);
    setActivities([]);
    (async () => {
      try {
        const data = await platformFetch('get_lead_detail', { lead_id: leadId });
        if (cancelled) return;
        const l = data.lead as Lead;
        setLead(l);
        setActivities((data.activities ?? []) as LeadActivity[]);
        setStage(l.stage);
        setNextActionDate(l.next_action_date ?? '');
        setNotes(l.notes ?? '');
      } catch (err: any) {
        if (!cancelled) {
          console.error('[Sales] get_lead_detail error:', err);
          toast({ variant: 'destructive', title: 'Failed to load lead', description: err.message });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, leadId, toast]);

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const data = await platformFetch('update_lead', {
        lead_id: lead.id,
        fields: {
          stage,
          next_action_date: nextActionDate || null,
          notes: notes || null,
        },
      });
      setLead(data.lead as Lead);
      toast({ title: 'Lead updated', description: lead.company_name });
      onLeadChanged();
    } catch (err: any) {
      console.error('[Sales] update_lead error:', err);
      toast({ variant: 'destructive', title: 'Failed to save', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogActivity = async () => {
    if (!lead || !activityBody.trim()) return;
    setLogging(true);
    try {
      const data = await platformFetch('add_lead_activity', {
        lead_id: lead.id,
        channel,
        body: activityBody.trim(),
      });
      setActivities(prev => [data.activity as LeadActivity, ...prev]);
      setActivityBody('');
      toast({ title: 'Touch logged', description: CHANNEL_LABEL[channel] });
      onLeadChanged();
    } catch (err: any) {
      console.error('[Sales] add_lead_activity error:', err);
      toast({ variant: 'destructive', title: 'Failed to log activity', description: err.message });
    } finally {
      setLogging(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {loading || !lead ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {lead.company_name}
                {lead.priority != null && (
                  <Badge variant="secondary" className="font-mono">P{lead.priority}</Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                {[lead.segment, lead.region].filter(Boolean).join(' · ') || 'Lead detail'}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Reference info */}
              <div className="space-y-3 text-sm">
                {lead.buyer_title && (
                  <div>
                    <span className="text-muted-foreground">Buyer: </span>
                    <span className="text-foreground">{lead.buyer_title}</span>
                  </div>
                )}
                {(lead.contact_name || lead.contact_phone || lead.contact_email) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {lead.contact_name && <span className="text-foreground">{lead.contact_name}</span>}
                    {lead.contact_phone && (
                      <a href={`tel:${lead.contact_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3.5 w-3.5" /> {lead.contact_phone}
                      </a>
                    )}
                    {lead.contact_email && (
                      <a href={`mailto:${lead.contact_email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Mail className="h-3.5 w-3.5" /> {lead.contact_email}
                      </a>
                    )}
                  </div>
                )}
                {lead.size_signal && (
                  <div>
                    <span className="text-muted-foreground">Size: </span>
                    <span className="text-foreground">{lead.size_signal}</span>
                  </div>
                )}
                {lead.why_fit && (
                  <div>
                    <span className="text-muted-foreground">Why they fit: </span>
                    <span className="text-foreground">{lead.why_fit}</span>
                  </div>
                )}
                {lead.outreach_approach && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <span className="text-muted-foreground">Suggested approach: </span>
                    <span className="text-foreground">{lead.outreach_approach}</span>
                  </div>
                )}
                {lead.source_url && (
                  <a
                    href={lead.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Source
                  </a>
                )}
              </div>

              <Separator />

              {/* Editable pipeline fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Stage</Label>
                  <Select value={stage} onValueChange={v => setStage(v as LeadStage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_STAGES.map(s => (
                        <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Next action</Label>
                  <Input
                    type="date"
                    value={nextActionDate}
                    onChange={e => setNextActionDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Internal notes…"
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>

              <Separator />

              {/* Log a touch */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Log a touch</h3>
                <div className="flex gap-2">
                  <Select value={channel} onValueChange={v => setChannel(v as LeadChannel)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_CHANNELS.map(c => (
                        <SelectItem key={c} value={c}>{CHANNEL_LABEL[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={activityBody}
                    onChange={e => setActivityBody(e.target.value)}
                    placeholder="What happened?"
                    onKeyDown={e => { if (e.key === 'Enter') handleLogActivity(); }}
                  />
                  <Button
                    onClick={handleLogActivity}
                    disabled={logging || !activityBody.trim()}
                    size="icon"
                    aria-label="Log touch"
                  >
                    {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Activity log */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Activity log {activities.length > 0 && <span className="text-muted-foreground">({activities.length})</span>}
                </h3>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No outreach logged yet.</p>
                ) : (
                  <ScrollArea className="max-h-72 pr-3">
                    <ul className="space-y-3">
                      {activities.map(a => (
                        <li key={a.id} className="rounded-lg border border-border bg-card/60 p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <Badge variant="outline">{CHANNEL_LABEL[a.channel]}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDateTime(a.occurred_at)}</span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{a.body}</p>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
