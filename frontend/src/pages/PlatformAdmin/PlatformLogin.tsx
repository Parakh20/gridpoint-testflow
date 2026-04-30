import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Zap } from 'lucide-react';

export default function PlatformLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('platform_authed') === 'true') {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password === import.meta.env.VITE_PLATFORM_ADMIN_PASSWORD) {
      sessionStorage.setItem('platform_authed', 'true');
      navigate('/admin', { replace: true });
    } else {
      setError('Invalid platform password');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="tf-bg-grid" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow-blue">
              <Zap className="h-5 w-5 text-primary-foreground" />
              <span className="absolute -inset-1 rounded-xl bg-primary/30 blur-md -z-10" />
            </div>
            <div>
              <p className="font-bold text-foreground">TestFlow</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Platform Admin
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="platform-password"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Platform Password
              </Label>
              <Input
                id="platform-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-11"
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Verifying…' : 'Enter Admin Panel'}
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Platform owner access only · optimustesting.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
