import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Inbox, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import { platformFetch } from './platformFetch';
import {
  EmailTemplateOption, InboxEmail, MailCompany, MailCompanyUser, SentEmailRow,
} from './emailTypes';

/**
 * Top-level mail surface for the admin panel: everything received at the
 * support address, everything sent from the panel, and a compose form — all
 * without having to first find and expand the right company row.
 *
 * The per-company CompanyEmailPanel still exists in the Companies tab; this is
 * the view that can show inbound mail from senders who match no profile at all
 * (company_id NULL), which the per-company view structurally cannot.
 */
export function MailTab({ active }: { active: boolean }) {
  const { toast } = useToast();
  const loadedOnce = useRef(false);

  const [inbox, setInbox] = useState<InboxEmail[]>([]);
  const [unhandledCount, setUnhandledCount] = useState(0);
  const [sentLog, setSentLog] = useState<SentEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnhandled, setOnlyUnhandled] = useState(false);

  // Compose
  const [companies, setCompanies] = useState<MailCompany[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateOption[]>([]);
  const [senderConfigured, setSenderConfigured] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [users, setUsers] = useState<MailCompanyUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [toUserId, setToUserId] = useState('');
  const [template, setTemplate] = useState('welcome');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const selectedTemplate = templates.find((t) => t.key === template);

  const loadThreads = async (unhandledOnly = onlyUnhandled) => {
    setLoading(true);
    try {
      const [inboxRes, sentRes] = await Promise.all([
        platformFetch('get_mail_inbox', { only_unhandled: unhandledOnly }),
        platformFetch('get_mail_sent'),
      ]);
      setInbox((inboxRes.emails ?? []) as InboxEmail[]);
      setUnhandledCount(inboxRes.unhandled_count ?? 0);
      setSentLog((sentRes.emails ?? []) as SentEmailRow[]);
    } catch (err: any) {
      console.error('[Mail] fetch error:', err);
      toast({ variant: 'destructive', title: 'Failed to load mail', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadComposeOptions = async () => {
    try {
      const [companyRes, tplRes] = await Promise.all([
        platformFetch('get_all_companies'),
        platformFetch('get_email_templates'),
      ]);
      setCompanies((companyRes.companies ?? []) as MailCompany[]);
      setTemplates((tplRes.templates ?? []) as EmailTemplateOption[]);
      setSenderConfigured(tplRes.sender_configured !== false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load compose options', description: err.message });
    }
  };

  useEffect(() => {
    if (active && !loadedOnce.current) {
      loadedOnce.current = true;
      loadThreads();
      loadComposeOptions();
    }
  }, [active]);

  // Recipients come from the chosen company — the send action addresses by
  // profile id, never a typed address.
  useEffect(() => {
    if (!companyId) { setUsers([]); setToUserId(''); return; }
    let cancelled = false;
    (async () => {
      setLoadingUsers(true);
      try {
        const detail = await platformFetch('get_company_detail', { company_id: companyId });
        if (cancelled) return;
        const list = (detail.users ?? []) as MailCompanyUser[];
        setUsers(list);
        const superadmin = list.find((u) => u.role === 'SUPERADMIN');
        setToUserId(superadmin?.id ?? list[0]?.id ?? '');
      } catch (err: any) {
        if (!cancelled) toast({ variant: 'destructive', title: 'Failed to load users', description: err.message });
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const send = async () => {
    if (!companyId || !toUserId) return;
    setSending(true);
    try {
      await platformFetch('send_company_email', {
        company_id: companyId,
        to_user_id: toUserId,
        template,
        subject: subject || null,
        message: message || null,
        actor: 'platform-admin',
      });
      toast({ title: 'Email sent' });
      setSubject('');
      setMessage('');
      await loadThreads();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Send failed', description: err.message });
    } finally {
      setSending(false);
    }
  };

  const toggleHandled = async (id: string, handled: boolean) => {
    try {
      await platformFetch('mark_inbound_handled', { inbound_id: id, handled });
      setInbox((prev) => prev.map((e) => (e.id === id ? { ...e, handled } : e)));
      setUnhandledCount((c) => Math.max(0, c + (handled ? -1 : 1)));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: err.message });
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox className="h-3.5 w-3.5" /> Inbox
            {unhandledCount > 0 && <Badge variant="destructive">{unhandledCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-3.5 w-3.5" /> Sent
          </TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
        </TabsList>

        {/* ── Inbox ─────────────────────────────────────────────────────────── */}
        <TabsContent value="inbox" className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={onlyUnhandled ? 'default' : 'outline'}
              onClick={() => { const next = !onlyUnhandled; setOnlyUnhandled(next); loadThreads(next); }}
            >
              {onlyUnhandled ? 'Showing unhandled only' : 'Show unhandled only'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => loadThreads()}>Refresh</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : inbox.length === 0 ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              Nothing received yet. Mail arrives here once Resend delivers an
              <span className="font-mono"> email.received </span>
              webhook to <span className="font-mono">resend-inbound</span>.
            </div>
          ) : (
            <div className="space-y-3">
              {inbox.map((e) => (
                <div key={e.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.subject || '(no subject)'}</span>
                    {!e.handled && <Badge variant="destructive">unhandled</Badge>}
                    {e.companies
                      ? <Badge variant="secondary">{e.companies.name}</Badge>
                      : <Badge variant="outline">no matching company</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {e.from_name ? `${e.from_name} <${e.from_email}>` : e.from_email}
                    {e.to_email && <> → {e.to_email}</>} · {formatDateTime(e.received_at)}
                  </div>
                  {e.text_body && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{e.text_body}</p>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto p-0 text-xs"
                    onClick={() => toggleHandled(e.id, !e.handled)}
                  >
                    Mark {e.handled ? 'unhandled' : 'handled'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Sent ──────────────────────────────────────────────────────────── */}
        <TabsContent value="sent" className="space-y-3 pt-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : sentLog.length === 0 ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">Nothing sent yet.</div>
          ) : (
            <div className="space-y-2">
              {sentLog.map((e) => (
                <div key={e.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.subject}</span>
                    {e.status === 'failed' && <Badge variant="destructive">failed</Badge>}
                    {e.companies && <Badge variant="secondary">{e.companies.name}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.to_email} · {formatDateTime(e.sent_at)} · {e.template} · {e.actor}
                  </div>
                  {e.error && <div className="text-xs text-destructive">{e.error}</div>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Compose ───────────────────────────────────────────────────────── */}
        <TabsContent value="compose" className="pt-4">
          <div className="grid max-w-2xl gap-3 rounded-lg border p-4 sm:grid-cols-2">
            {!senderConfigured && (
              <p className="text-xs text-destructive sm:col-span-2">
                RESEND_API_KEY is not configured on this project — sending is unavailable.
              </p>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Recipient</Label>
              <Select value={toUserId} onValueChange={setToUserId} disabled={!companyId || loadingUsers}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? 'Loading…' : 'Select a user'} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} · {u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate?.requires_subject && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
              </div>
            )}

            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">
                {selectedTemplate?.requires_message ? 'Message' : 'Note to append (optional)'}
              </Label>
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} />
            </div>

            <div className="sm:col-span-2">
              <Button disabled={sending || !companyId || !toUserId || !senderConfigured} onClick={send}>
                {sending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                Send
              </Button>
              {companyId && !loadingUsers && users.length === 0 && (
                <span className="ml-2 text-xs text-muted-foreground">This company has no users to email.</span>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
