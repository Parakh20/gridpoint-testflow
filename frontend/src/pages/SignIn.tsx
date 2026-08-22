import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Login is per-subdomain (one workspace per company) — there is no single
// global login on the apex marketing domain. This page just resolves a
// workspace slug to its subdomain and redirects there; the actual
// email/password form lives on that subdomain's /auth page (Auth.tsx).
export default function SignIn() {
  const { toast } = useToast();
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('slug')
        .eq('slug', normalized)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({ title: 'Workspace not found', description: `No workspace at "${normalized}" — check the name and try again.`, variant: 'destructive' });
        setLoading(false);
        return;
      }
      window.location.href = `https://${data.slug}.optimustesting.com/auth`;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find workspace';
      toast({ title: 'Something went wrong', description: message, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <a href="/" className="text-white/50 text-sm hover:text-white">← Back to TestFlow</a>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
        <p className="mt-2 text-white/60 text-sm">Enter your workspace name to continue.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="slug" className="text-white/80">Workspace name</Label>
            <div className="flex items-center rounded-md border border-white/15 bg-white/[.03] focus-within:border-white/30">
              <Input
                id="slug"
                required
                value={slug}
                onChange={e => setSlug(e.target.value)}
                disabled={loading}
                placeholder="yourcompany"
                className="border-0 bg-transparent focus-visible:ring-0"
              />
              <span className="pr-3 text-white/40 text-sm whitespace-nowrap">.optimustesting.com</span>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !slug.trim()}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Don't have a workspace yet? <a href="/start-trial" className="text-white hover:underline">Start a free trial</a>
        </p>
      </div>
    </div>
  );
}
