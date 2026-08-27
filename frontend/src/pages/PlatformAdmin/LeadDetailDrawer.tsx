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
import { Loader2, ExternalLink, Phone, Mail, Save, Plus, Linkedin, Star, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import { platformFetch } from './platformFetch';
import {
  Lead,
  LeadActivity,
  LeadContact,
  LeadStage,
  LeadChannel,
  ContactSeniority,
  LEAD_STAGES,
  LEAD_CHANNELS,
  CONTACT_SENIORITIES,
  STAGE_LABEL,
  CHANNEL_LABEL,
  SENIORITY_LABEL,
  EMAIL_STATUS_LABEL, employeeCountLabel } from './leadTypes';

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
  const [contacts, setContacts] = useState<LeadContact[]>([]);

  // new contact form
  const [cName, setCName] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cSeniority, setCSeniority] = useState<ContactSeniority>('C_SUITE');
  const [savingContact, setSavingContact] = useState(false);

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
    setContacts([]);
    (async () => {
      try {
        const data = await platformFetch('get_lead_detail', { lead_id: leadId });
        if (cancelled) return;
        const l = data.lead as Lead;
        setLead(l);
        setActivities((data.activities ?? []) as LeadActivity[]);
        setContacts((data.contacts ?? []) as LeadContact[]);
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

  const handleAddContact = async () => {
    if (!lead) return;
    if (!cEmail.trim() && !cName.trim()) return;
    setSavingContact(true);
    try {
      const data = await platformFetch('upsert_lead_contact', {
        lead_id: lead.id,
        fields: {
          full_name: cName.trim() || null,
          title: cTitle.trim() || null,
          email: cEmail.trim() || null,
          phone: cPhone.trim() || null,
          seniority: cSeniority,
          // Anything typed in by hand is unverified until someone actually
          // gets a reply from it.
          email_status: 'UNVERIFIED',
        },
      });
      const saved = data.contact as LeadContact;
      setContacts(prev => [...prev.filter(c => c.id !== saved.id), saved]);
      setCName(''); setCTitle(''); setCEmail(''); setCPhone('');
      toast({ title: 'Contact saved', description: saved.full_name ?? saved.email ?? '' });
      onLeadChanged();
    } catch (err: any) {
      console.error('[Sales] upsert_lead_contact error:', err);
      toast({ variant: 'destructive', title: 'Failed to save contact', description: err.message });
    } finally {
      setSavingContact(false);
    }
  };

  const handleMakePrimary = async (contact: LeadContact) => {
    if (!lead) return;
    try {
      const data = await platformFetch('upsert_lead_contact', {
        lead_id: lead.id,
        fields: {
          full_name: contact.full_name,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          seniority: contact.seniority,
          email_status: contact.email_status,
          is_primary: true,
        },
      });
      const saved = data.contact as LeadContact;
      setContacts(prev => prev.map(c => ({ ...c, is_primary: c.id === saved.id })));
      onLeadChanged();
    } catch (err: any) {
      console.error('[Sales] upsert_lead_contact error:', err);
      toast({ variant: 'destructive', title: 'Failed to set primary', description: err.message });
    }
  };

  const handleDeleteContact = async (contact: LeadContact) => {
    try {
      await platformFetch('delete_lead_contact', { contact_id: contact.id });
      setContacts(prev => prev.filter(c => c.id !== contact.id));
      onLeadChanged();
    } catch (err: any) {
      console.error('[Sales] delete_lead_contact error:', err);
      toast({ variant: 'destructive', title: 'Failed to remove contact', description: err.message });
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
                {(lead.size_signal || lead.employee_count_min != null || lead.employee_count_max != null) && (
                  <div>
                    <span className="text-muted-foreground">Size: </span>
                    <span className="text-foreground">
                      {employeeCountLabel(lead.employee_count_min, lead.employee_count_max)
                        ? `${employeeCountLabel(lead.employee_count_min, lead.employee_count_max)} people`
                        : null}
                      {employeeCountLabel(lead.employee_count_min, lead.employee_count_max) && lead.size_signal ? ' · ' : ''}
                      {lead.size_signal}
                    </span>
                  </div>
                )}
                {lead.tech_stack && (
                  <div>
                    <span className="text-muted-foreground">Tech today: </span>
                    <span className="text-foreground">{lead.tech_stack}</span>
                    {lead.tech_stack_source && (
                      <span className="text-muted-foreground"> ({lead.tech_stack_source})</span>
                    )}
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

              {/* Contact book */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Contacts {contacts.length > 0 && <span className="text-muted-foreground">({contacts.length})</span>}
                </h3>
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No contacts yet — add the decision maker below.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {contacts.map(c => (
                      <li key={c.id} className="rounded-lg border border-border bg-card/60 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">
                                {c.full_name ?? c.title ?? c.email ?? 'Contact'}
                              </span>
                              <Badge variant="secondary">{SENIORITY_LABEL[c.seniority]}</Badge>
                              {c.is_primary && <Badge>Primary</Badge>}
                            </div>
                            {c.full_name && c.title && (
                              <p className="text-xs text-muted-foreground">{c.title}</p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
                              {c.email && (
                                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                                  <Mail className="h-3.5 w-3.5" /> {c.email}
                                </a>
                              )}
                              {c.phone && (
                                <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                                </a>
                              )}
                              {c.linkedin_url && (
                                <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                                </a>
                              )}
                              {c.email && (
                                <Badge
                                  variant={c.email_status === 'PUBLISHED' ? 'outline' : 'destructive'}
                                  title={
                                    c.email_status === 'PUBLISHED'
                                      ? "Read off the company's own site"
                                      : 'From a directory or an inferred mapping — verify before sending'
                                  }
                                >
                                  {EMAIL_STATUS_LABEL[c.email_status]}
                                </Badge>
                              )}
                            </div>
                            {c.notes && (
                              <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap">{c.notes}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {!c.is_primary && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Make primary contact"
                                title="Make primary contact"
                                onClick={() => handleMakePrimary(c)}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remove contact"
                              title="Remove contact"
                              onClick={() => handleDeleteContact(c)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Input value={cName} onChange={e => setCName(e.target.value)} placeholder="Name" />
                  <Input value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="Title" />
                  <Input value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="Email" type="email" />
                  <Input value={cPhone} onChange={e => setCPhone(e.target.value)} placeholder="Phone" />
                  <Select value={cSeniority} onValueChange={v => setCSeniority(v as ContactSeniority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_SENIORITIES.map(sn => (
                        <SelectItem key={sn} value={sn}>{SENIORITY_LABEL[sn]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddContact}
                    disabled={savingContact || (!cEmail.trim() && !cName.trim())}
                    className="gap-2"
                  >
                    {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add contact
                  </Button>
                </div>
              </div>

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
