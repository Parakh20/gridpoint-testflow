import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
};

export default function StartTrial() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan');
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ workspace_url: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-trial', {
        body: { company_name: companyName, email, password, full_name: fullName },
      });
      if (error || !data?.workspace_url) {
        throw new Error((data?.message as string) ?? error?.message ?? 'Failed to start trial');
      }
      setResult(data as { workspace_url: string });
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
          <CheckCircle2 className="w-12 h-12 text-[#3b82f6] mx-auto" />
          <h1 className="text-2xl font-semibold">Your workspace is ready</h1>
          <p className="text-white/60 text-sm">
            Your 14-day trial has started. Sign in at your workspace to get going.
          </p>
          <Button asChild className="w-full">
            <a href={`${result.workspace_url}/auth`}>Go to your workspace</a>
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
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-white/80">Your name</Label>
            <Input id="full_name" required value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/80">Work email</Label>
            <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <Input id="password" type="password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
            <p className="text-[11px] text-white/40">10+ characters, with uppercase, lowercase, and a number.</p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start free trial
          </Button>
        </form>
      </div>
    </div>
  );
}
