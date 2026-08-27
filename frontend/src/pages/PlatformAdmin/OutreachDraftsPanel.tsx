/**
 * Review-and-send for outreach mail.
 *
 * Drafts are authored in the repo (templates plus a per-company hook) and seeded
 * into `outreach_drafts`. This panel is where they get read one last time,
 * edited if the research has gone stale, and sent -- over SMTP from a real
 * mailbox, never through Resend, whose AUP prohibits cold outreach and whose one
 * API key also carries rework notices and trial confirmations.
 *
 * Sending also logs the touch and schedules the follow-up server-side, so the
 * two steps that always get skipped when moving fast cannot be skipped at all.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, Send, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { platformFetch } from './platformFetch';

export type DraftStatus = 'DRAFT' | 'SENT' | 'FAILED';

export interface OutreachDraft {
  id: string;
  lead_id: string;
  contact_id: string | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  body: string;
  status: DraftStatus;
  sent_at: string | null;
  error: string | null;
  message_id: string | null;
  lead: { company_name: string; priority: number | null; stage: string } | null;
}

const STATUS_BADGE: Record<DraftStatus, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  SENT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  FAILED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const STATUS_ICON: Record<DraftStatus, typeof Mail> = {
  DRAFT: Mail,
  SENT: CheckCircle2,
  FAILED: XCircle,
};

/** Sort so unsent work is at the top and the record of what went out sits below. */
export function sortDrafts(drafts: OutreachDraft[]): OutreachDraft[] {
  const rank: Record<DraftStatus, number> = { FAILED: 0, DRAFT: 1, SENT: 2 };
  return [...drafts].sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return (b.lead?.priority ?? 0) - (a.lead?.priority ?? 0);
  });
}

export function OutreachDraftsPanel({ onSent }: { onSent: () => void }) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [smtp, setSmtp] = useState<{ configured: boolean; from: string | null }>({ configured: false, from: null });

  const [openId, setOpenId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [followUpDays, setFollowUpDays] = useState(7);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [draftRes, smtpRes] = await Promise.all([
        platformFetch('get_outreach_drafts'),
        platformFetch('get_smtp_status'),
      ]);
      setDrafts(sortDrafts((draftRes.drafts ?? []) as OutreachDraft[]));
      setSmtp({ configured: smtpRes.configured === true, from: smtpRes.from ?? null });
    } catch (err) {
      console.error('Failed to load outreach drafts', err);
      toast({
        title: 'Could not load drafts',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const open = drafts.find(d => d.id === openId) ?? null;

  const openDraft = (draft: OutreachDraft) => {
    setOpenId(draft.id);
    setSubject(draft.subject);
    setBody(draft.body);
    setFollowUpDays(7);
  };

  const save = async () => {
    if (!open) return;
    setSaving(true);
    try {
      await platformFetch('update_outreach_draft', { draft_id: open.id, subject, body });
      toast({ title: 'Draft saved' });
      await load();
    } catch (err) {
      console.error('update_outreach_draft failed', err);
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (!open) return;
    setSending(true);
    try {
      // Save first: sending a draft that still has unsaved edits on screen would
      // deliver the stored version, not the one just read and approved.
      await platformFetch('update_outreach_draft', { draft_id: open.id, subject, body });
      await platformFetch('send_outreach_draft', { draft_id: open.id, follow_up_days: followUpDays });
      toast({
        title: 'Sent',
        description: `${open.lead?.company_name ?? open.to_email} — follow-up in ${followUpDays} days`,
      });
      setOpenId(null);
      await load();
      onSent();
    } catch (err) {
      console.error('send_outreach_draft failed', err);
      toast({
        title: 'Send failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      await load();
    } finally {
      setSending(false);
    }
  };

  const pending = drafts.filter(d => d.status !== 'SENT').length;

  return (
    <section className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Outreach drafts</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading…'
              : pending === 0 ? 'All sent.'
              : `${pending} ready to review and send.`}
            {smtp.from ? ` Sending as ${smtp.from}.` : ''}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>Refresh</Button>
      </header>

      {!loading && !smtp.configured && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            SMTP isn't configured, so sending is disabled. Set <code>SMTP_USER</code> and{' '}
            <code>SMTP_APP_PASSWORD</code> as Supabase function secrets — the password must be a
            Gmail App Password, not the account password.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : drafts.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No drafts yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border/60">
          {drafts.map(d => {
            const Icon = STATUS_ICON[d.status];
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => openDraft(d)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/40"
                >
                  <Icon className={cn('h-4 w-4 shrink-0',
                    d.status === 'SENT' ? 'text-emerald-600 dark:text-emerald-400'
                      : d.status === 'FAILED' ? 'text-rose-600 dark:text-rose-400'
                      : 'text-muted-foreground')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">
                      {d.lead?.company_name ?? '(unknown lead)'}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.to_email}
                      {d.sent_at ? ` · sent ${formatDateTime(d.sent_at)}` : ''}
                      {d.error ? ` · ${d.error}` : ''}
                    </span>
                  </span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[d.status])}>
                    {d.status}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open != null} onOpenChange={o => !o && setOpenId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{open?.lead?.company_name ?? 'Draft'}</DialogTitle>
            <DialogDescription>
              To {open?.to_name ? `${open.to_name} <${open.to_email}>` : open?.to_email}.
              {open?.status === 'SENT'
                ? ' Already sent — this is the record of what went out.'
                : ' Read it once more before sending; the hook line is the part that goes stale.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Subject</label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={open?.status === 'SENT'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Message (plain text)</label>
              <Textarea
                rows={18}
                value={body}
                onChange={e => setBody(e.target.value)}
                disabled={open?.status === 'SENT'}
                className="font-mono text-xs"
              />
            </div>
            {open?.status !== 'SENT' && (
              <div className="flex items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Follow up in (days)</label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={followUpDays}
                    onChange={e => setFollowUpDays(Number(e.target.value))}
                    className="w-28"
                  />
                </div>
                <p className="pb-2 text-xs text-muted-foreground">
                  Sending logs the touch, moves the lead to Contacted and sets this date.
                </p>
              </div>
            )}
            {open?.error && (
              <p className="text-xs text-rose-600 dark:text-rose-400">Last error: {open.error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenId(null)} disabled={saving || sending}>
              Close
            </Button>
            {open?.status !== 'SENT' && (
              <>
                <Button variant="outline" onClick={save} disabled={saving || sending}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save draft
                </Button>
                <Button onClick={send} disabled={!smtp.configured || saving || sending}>
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
