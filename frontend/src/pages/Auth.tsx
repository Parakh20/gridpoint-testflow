import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Activity, FileCheck, Users, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

const STATS = [
  { icon: Activity, value: '8', label: 'Equipment Types' },
  { icon: FileCheck, value: '46', label: 'Test Templates' },
  { icon: Users, value: '4', label: 'Role Levels' },
];

const FEATURES = [
  'Tenant-isolated workspaces',
  'Live test data sync',
  'AI-generated reports',
  'Excel + PDF export',
];

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, resetPasswordForEmail, updatePassword, companyMismatch } = useAuth();
  const { company } = useCompany();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isResetMode = new URLSearchParams(location.search).get('reset') === 'true';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Authentication failed', description: error.message });
    } else {
      navigate('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await resetPasswordForEmail(forgotEmail);
    setForgotLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to send reset email', description: error.message });
    } else {
      toast({ title: 'Reset email sent', description: 'Check your inbox for a password reset link.' });
      setForgotOpen(false);
      setForgotEmail('');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Must be at least 8 characters.' });
      return;
    }
    setResetLoading(true);
    const { error } = await updatePassword(newPassword);
    setResetLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to update password', description: error.message });
    } else {
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      navigate('/');
    }
  };

  if (isResetMode) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="tf-bg-grid" />
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow-blue">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-bold text-foreground">TestFlow</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Set new password</p>
              </div>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {resetLoading ? 'Updating…' : 'Set New Password'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background layers */}
      <div className="tf-bg-grid" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60rem 40rem at 18% 20%, hsl(var(--primary)/0.18), transparent 60%),' +
            'radial-gradient(50rem 36rem at 90% 90%, hsl(var(--accent)/0.16), transparent 65%)',
        }}
      />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-stretch lg:grid-cols-[1.1fr_0.9fr]">
        {/* ── Hero panel ─────────────────────────────────────────────────── */}
        <div className="relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
          {/* logo */}
          <div className="flex items-center gap-3 animate-fade-up">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-glow-blue">
              <Zap className="h-6 w-6 text-primary-foreground" />
              <span className="absolute -inset-1 rounded-xl bg-primary/30 blur-md -z-10" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-foreground">TestFlow</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                Grid Control · v1.0
              </p>
            </div>
          </div>

          {/* headline */}
          <div className="space-y-6 animate-fade-up" style={{ animationDelay: '80ms' }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Live · Multi-tenant SaaS
              </span>
            </div>

            <h2 className="text-5xl font-bold tracking-tight text-foreground leading-[1.05] xl:text-6xl">
              From test sheet
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                to energized bus.
              </span>
            </h2>

            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              Field teams capture commissioning data, managers approve results, and GMs ship reports —
              all from one workspace per company.
            </p>

            <ul className="space-y-2 pt-2">
              {FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground/90">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* stats */}
          <div className="grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: '160ms' }}>
            {STATS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/40"
              >
                <Icon size={16} className="text-primary mb-2" />
                <p className="font-mono text-2xl font-semibold leading-none text-foreground">{value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Form panel ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md animate-fade-up" style={{ animationDelay: '120ms' }}>
            {/* mobile logo */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow-blue">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="text-lg font-bold tracking-tight text-foreground">TestFlow</p>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
              {companyMismatch ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <ShieldCheck className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Wrong workspace</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This account does not belong to this workspace.
                      <br />
                      Please visit your company's login page.
                    </p>
                  </div>
                </div>
              ) : (
              <>
              <div className="mb-6">
                {company ? (
                  <>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                      {company.name}
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                      Sign in
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use your company credentials to continue.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                      Welcome back
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sign in to your account to continue.
                    </p>
                  </>
                )}
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Password
                    </Label>
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="group h-11 w-full text-sm font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Encrypted in transit · tenant-isolated by RLS</span>
              </div>
              </>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Need access? Contact your company administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={open => { setForgotOpen(open); if (!open) setForgotEmail(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter your email and we'll send you a link to reset your password.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input id="forgot-email" type="email" placeholder="engineer@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={forgotLoading}>
                {forgotLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {forgotLoading ? 'Sending…' : 'Send Reset Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
