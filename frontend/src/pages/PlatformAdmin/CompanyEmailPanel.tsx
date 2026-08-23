import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import { platformFetch } from './platformFetch';
import { EmailTemplateOption, InboundEmail, SentEmail } from './emailTypes';

interface CompanyUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Props {
  companyId: string;
  users: CompanyUser[];
}

/**
 * Two-way mail view for one company: send a templated or freeform message to a
 * member, and see what has been sent (email_log) and received
 * (inbound_emails, populated by the resend-inbound webhook).
 *
 * Recipients are picked from the company's own users rather than typed — the
 * send action addresses by profile id on purpose, so a leaked platform token
 * cannot mail arbitrary addresses from our verified sending domain.
 */
export function CompanyEmailPanel({ companyId, users }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplateOption[]>([]);
  const [senderConfigured, setSenderConfigured] = useState(true);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [received, setReceived] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [toUserId, setToUserId] = useState('');
  const [template, setTemplate] = useState('welcome');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const selectedTemplate = templates.find((t) => t.key === template);

  const load = async () => {
    setLoading(true);
    try {
      const [tpl, thread] = await Promise.all([
        platformFetch('get_email_templates'),
        platformFetch('get_company_emails', { company_id: companyId }),
      ]);
      setTemplates((tpl.templates ?? []) as EmailTemplateOption[]);
      setSenderConfigured(tpl.sender_configured !== false);
      setSent((thread.sent ?? []) as SentEmail[]);
      setReceived((thread.received ?? []) as InboundEmail[]);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load email history', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId]);

  // Default to a SUPERADMIN — the person an operator almost always means.
  useEffect(() => {
    if (toUserId) return;
    const superadmin = users.find((u) => u.role === 'SUPERADMIN');
    if (superadmin) setToUserId(superadmin.id);
    else if (users.length > 0) setToUserId(users[0].id);
  }, [users, toUserId]);

  const send = async () => {
    if (!toUserId) return;
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
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Send failed', description: err.message });
    } finally {
      setSending(false);
    }
  };

  const markHandled = async (id: string, handled: boolean) => {
    try {
      await platformFetch('mark_inbound_handled', { inbound_id: id, handled });
      setReceived((prev) => prev.map((e) => (e.id === id ? { ...e, handled } : e)));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: err.message });
    }
  };

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Mail className="h-3 w-3" /> Email
      </p>

      {!senderConfigured && (
        <p className="text-xs text-destructive">
          RESEND_API_KEY is not configured on this project — sending is unavailable.
        </p>
      )}

      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Recipient</Label>
          <Select value={toUserId} onValueChange={setToUserId}>
            <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email} · {u.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
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
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} />
        </div>

        <div className="sm:col-span-2">
          <Button
            size="sm"
            disabled={sending || !toUserId || users.length === 0 || !senderConfigured}
            onClick={send}
          >
            {sending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
            Send
          </Button>
          {users.length === 0 && (
            <span className="ml-2 text-xs text-muted-foreground">This company has no users to email.</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium">Sent ({sent.length})</p>
            {sent.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">Nothing sent yet</p>
            ) : (
              <div className="space-y-2">
                {sent.map((e) => (
                  <div key={e.id} className="border-b pb-2 text-xs last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.subject}</span>
                      {e.status === 'failed' && <Badge variant="destructive">failed</Badge>}
                    </div>
                    <div className="text-muted-foreground">
                      {e.to_email} · {formatDateTime(e.sent_at)} · {e.template}
                    </div>
                    {e.error && <div className="text-destructive">{e.error}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium">Received ({received.length})</p>
            {received.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">Nothing received yet</p>
            ) : (
              <div className="space-y-2">
                {received.map((e) => (
                  <div key={e.id} className="border-b pb-2 text-xs last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.subject || '(no subject)'}</span>
                      {!e.handled && <Badge variant="secondary">new</Badge>}
                    </div>
                    <div className="text-muted-foreground">
                      {e.from_name ? `${e.from_name} <${e.from_email}>` : e.from_email} · {formatDateTime(e.received_at)}
                    </div>
                    {e.text_body && (
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground line-clamp-4">{e.text_body}</p>
                    )}
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => markHandled(e.id, !e.handled)}
                    >
                      Mark {e.handled ? 'unhandled' : 'handled'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
