import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, MailCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseFunctionsErrorBody } from '@/lib/functionsError';

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
};

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const INDUSTRIES = [
  'Testing & commissioning contractor',
  'EPC contractor',
  'Utility / transmission operator',
  'Industrial plant',
  'Consultancy',
  'Other',
];

export default function StartTrial() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan');
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ workspace_url: string; email_sent: boolean } | null>(null);

  // Mirrors start-trial's server-side check so the user sees the problem
  // before a failed round-trip. The server remains the real gate.
  // Tracked per-rule rather than as one boolean so the user can see exactly
  // which requirement is unmet instead of re-reading the whole sentence.
  const passwordRules = [
    { label: 'At least 10 characters', met: password.length >= 10 },
    { label: 'An uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'A lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'A number (0-9)', met: /\d/.test(password) },
  ];
  const passwordValid = passwordRules.every(r => r.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-trial', {
        body: {
          company_name: companyName,
          email,
          password,
          full_name: fullName,
          phone,
          company_size: companySize,
          industry,
          country,
        },
      });
      // supabase-js throws on any non-2xx and leaves error.message as the
      // useless "Edge Function returned a non-2xx status code" — the real
      // validation message ("Password must include...") is in the response body.
      const body = error ? await parseFunctionsErrorBody(error) : data;
      if (!body?.workspace_url) {
        if (typeof body?.retry_after_seconds === 'number') {
          const mins = Math.ceil(body.retry_after_seconds / 60);
          throw new Error(`Too many signups from your network. Please try again in about ${mins} minute${mins === 1 ? '' : 's'}.`);
        }
        throw new Error(
          (body?.message as string) ?? (body?.error as string) ?? error?.message ?? 'Failed to start trial',
        );
      }
      setResult(body as unknown as { workspace_url: string; email_sent: boolean });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start trial';
      toast({ title: 'Sign up failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          {result.email_sent ? (
            <>
              <MailCheck className="w-12 h-12 text-[#3b82f6] mx-auto" />
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="text-white/60 text-sm">
                We sent a confirmation link to <span className="text-white">{email}</span>. Click it to
                activate your workspace and start your 14-day trial.
              </p>
              <p className="text-white/40 text-xs">
                Can't find it? Check your spam folder — the link expires in 24 hours.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
              <h1 className="text-2xl font-semibold">Workspace created — email not sent</h1>
              <p className="text-white/60 text-sm">
                Your workspace was created, but we couldn't send the confirmation email to{' '}
                <span className="text-white">{email}</span>, so you can't sign in yet.
              </p>
              <p className="text-white/40 text-xs">
                Please contact support and we'll activate your account manually.
              </p>
            </>
          )}
          <Button asChild variant="outline" className="w-full">
            <a href="/">Back to TestFlow</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <a href="/" className="text-white/50 text-sm hover:text-white">← Back to TestFlow</a>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Start your free trial</h1>
        <p className="mt-2 text-white/60 text-sm">
          14 days, no card required.
          {plan && PLAN_NAMES[plan] ? ` You picked ${PLAN_NAMES[plan]} — you can subscribe any time from your workspace's Billing page.` : ''}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company_name" className="text-white/80">Company name</Label>
            <Input id="company_name" required value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={loading} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company_size" className="text-white/80">Company size</Label>
              <select
                id="company_size"
                value={companySize}
                onChange={e => setCompanySize(e.target.value)}
                disabled={loading}
                className="w-full h-10 rounded-md border border-white/15 bg-white/[.03] px-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-neutral-900 [&>option]:text-white"
              >
                <option value="">Select…</option>
                {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} people</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country" className="text-white/80">Country</Label>
              <Input id="country" value={country} onChange={e => setCountry(e.target.value)} disabled={loading} placeholder="India" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry" className="text-white/80">What best describes you?</Label>
            <select
              id="industry"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              disabled={loading}
              className="w-full h-10 rounded-md border border-white/15 bg-white/[.03] px-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-white/30 [&>option]:bg-neutral-900 [&>option]:text-white"
            >
              <option value="">Select…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-white/80">Your name</Label>
            <Input id="full_name" required value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-white/80">Phone <span className="text-white/35">(optional)</span></Label>
            <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/80">Work email</Label>
            <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <Input id="password" type="password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
            <ul className="space-y-0.5 pt-0.5">
              {passwordRules.map(rule => (
                <li
                  key={rule.label}
                  className={`text-[11px] flex items-center gap-1.5 ${
                    password.length === 0 ? 'text-white/40' : rule.met ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  <span aria-hidden="true">{password.length > 0 && rule.met ? '✓' : '•'}</span>
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !passwordValid}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start free trial
          </Button>
        </form>
      </div>
    </div>
  );
}
