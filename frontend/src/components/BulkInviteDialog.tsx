import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Supabase auth rate limits cap admin-API user creation when SMTP sends are
// involved. We process sequentially with a small delay so a 50-user batch
// doesn't trip the limit and silently drop half the invites.
const INTER_INVITE_DELAY_MS = 800;

type Role = 'SUPERADMIN' | 'GM' | 'SUPERVISOR' | 'ENGINEER';

type RowState =
  | { status: 'pending' }
  | { status: 'in_progress' }
  | { status: 'success' }
  | { status: 'failed'; reason: string };

interface ParsedRow {
  name: string;
  email: string;
}

interface BulkInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const generatePassword = () => {
  // Guarantee complexity rules expected by the server-side check
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower  = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%';
  const pool = upper + lower + digits + symbols;
  const pick = (src: string) => {
    const b = new Uint8Array(1); crypto.getRandomValues(b); return src[b[0] % src.length];
  };
  const required = [pick(upper), pick(lower), pick(digits)];
  const rest = Array.from({ length: 9 }, () => pick(pool));
  const all = [...required, ...rest];
  for (let i = all.length - 1; i > 0; i--) {
    const b = new Uint8Array(1); crypto.getRandomValues(b);
    const j = b[0] % (i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.join('');
};

const parseInput = (raw: string): ParsedRow[] => {
  // Accept "Name, email@x.com" per line, or just "email@x.com"
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(/[,\t]/).map(p => p.trim()).filter(Boolean);
      if (parts.length === 1) return { name: parts[0].split('@')[0], email: parts[0] };
      return { name: parts[0], email: parts[1] };
    })
    .filter(r => /\S+@\S+\.\S+/.test(r.email));
};

export function BulkInviteDialog({ open, onOpenChange, onSuccess }: BulkInviteDialogProps) {
  const [input, setInput] = useState('');
  const [role, setRole] = useState<Role>('ENGINEER');
  const [running, setRunning] = useState(false);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  const rows = parseInput(input);

  const handleRun = async () => {
    if (!rows.length) {
      toast.error('No valid emails found');
      return;
    }

    setRunning(true);
    setRowStates(Object.fromEntries(rows.map(r => [r.email, { status: 'pending' }] as const)));

    const credentials: Array<{ email: string; password: string }> = [];
    let successes = 0;
    let failures = 0;

    for (const row of rows) {
      setRowStates(prev => ({ ...prev, [row.email]: { status: 'in_progress' } }));
      const password = generatePassword();

      try {
        const { data: result, error } = await supabase.functions.invoke('create-user', {
          body: { name: row.name, email: row.email, password, role },
        });
        if (error) throw error;
        if (result?.error) throw new Error(result.error);

        credentials.push({ email: row.email, password });
        successes += 1;
        setRowStates(prev => ({ ...prev, [row.email]: { status: 'success' } }));
      } catch (err: unknown) {
        failures += 1;
        const message = err instanceof Error ? err.message : 'Unknown error';
        // Detect Supabase auth rate-limit so we can stop early instead of
        // burning the rest of the batch on the same error.
        const rateLimited = /rate limit|429|over_email_send_rate_limit/i.test(message);
        setRowStates(prev => ({ ...prev, [row.email]: { status: 'failed', reason: message } }));

        if (rateLimited) {
          toast.error('Email rate limit reached', {
            description: 'Stopping batch. Configure custom SMTP in Supabase to lift this limit, then retry the failed rows.',
          });
          // Mark remaining as pending-skipped
          setRowStates(prev => {
            const updated = { ...prev };
            for (const r of rows) {
              if (updated[r.email]?.status === 'pending') {
                updated[r.email] = { status: 'failed', reason: 'Skipped — rate limit hit earlier in batch' };
              }
            }
            return updated;
          });
          break;
        }
      }

      // Brief pause between invites to stay under per-IP buckets
      await new Promise(r => setTimeout(r, INTER_INVITE_DELAY_MS));
    }

    setRunning(false);

    if (successes > 0) {
      toast.success(`${successes} user${successes === 1 ? '' : 's'} created`, {
        description: failures > 0 ? `${failures} failed — see the list for details.` : 'All invites sent successfully.',
      });
      onSuccess();
    } else if (failures > 0) {
      toast.error('No users created', { description: 'All invites failed — see the list for details.' });
    }

    if (credentials.length > 0) {
      // Surface credentials so the admin can send them out. Copy via prompt
      // is intentionally simple — these are temp passwords.
      console.table(credentials);
    }
  };

  const renderRowState = (email: string) => {
    const s = rowStates[email];
    if (!s || s.status === 'pending') return <span className="text-muted-foreground text-xs">queued</span>;
    if (s.status === 'in_progress') return <Loader2 className="h-4 w-4 animate-spin" />;
    if (s.status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <XCircle className="h-4 w-4" />
        <span className="truncate max-w-[180px]" title={s.reason}>{s.reason}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!running) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Invite Users</DialogTitle>
          <DialogDescription>
            Paste one user per line as <code>Name, email@example.com</code>. Sent sequentially with a short delay
            to stay under Supabase auth rate limits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Role for all invitees</Label>
            <Select value={role} onValueChange={v => setRole(v as Role)} disabled={running}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ENGINEER">Engineer</SelectItem>
                <SelectItem value="SUPERVISOR">Manager</SelectItem>
                <SelectItem value="GM">GM</SelectItem>
                <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-emails">Users</Label>
            <Textarea
              id="bulk-emails"
              rows={6}
              disabled={running}
              placeholder={'Jane Doe, jane@example.com\nbob@example.com'}
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Parsed: {rows.length} valid row{rows.length === 1 ? '' : 's'}
            </p>
          </div>

          {rows.length > 0 && Object.keys(rowStates).length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
              {rows.map(r => (
                <div key={r.email} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                  </div>
                  <div className="shrink-0">{renderRowState(r.email)}</div>
                </div>
              ))}
            </div>
          )}

          {rows.length > 30 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                With Supabase's default built-in SMTP the email rate limit is very low. For batches over ~30 users,
                configure custom SMTP first (Supabase Dashboard → Auth → SMTP).
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            {running ? 'Running…' : 'Close'}
          </Button>
          <Button onClick={handleRun} disabled={running || rows.length === 0}>
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {running ? `Sending (${Object.values(rowStates).filter(s => s.status === 'success' || (s.status === 'failed')).length}/${rows.length})` : `Send ${rows.length} invite${rows.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
