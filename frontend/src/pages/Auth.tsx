import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Activity, FileCheck, Users } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

const STATS = [
  { icon: Activity, value: '8', label: 'Equipment Types' },
  { icon: FileCheck, value: '46', label: 'Test Templates' },
  { icon: Users, value: '4', label: 'Role Levels' },
];

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPasswordForEmail, updatePassword } = useAuth();
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signUp(email, password, name);
    setIsLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Registration failed', description: error.message });
    } else {
      toast({ title: 'Account created', description: 'You can now sign in with your credentials.' });
      navigate('/');
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setOauthLoading(false);
      toast({ variant: 'destructive', title: 'Google sign-in failed', description: error.message });
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
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Must be at least 6 characters.' });
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
                <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
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
    <div className="min-h-screen bg-background" style={{ display: 'grid', gridTemplateColumns: '1fr 480px' }}>
      <div className="tf-bg-grid" />

      {/* ── Left panel ── */}
      <div className="relative flex flex-col justify-between p-12 overflow-hidden">
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 40% 55%, hsl(var(--primary)/0.12) 0%, transparent 70%)' }}
        />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3 animate-fade-up">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-glow-blue">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-foreground">TestFlow</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Grid Control</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10 space-y-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <h2 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
            From test sheet<br />to energized bus.
          </h2>
          <p className="text-base text-muted-foreground max-w-sm leading-relaxed">
            Manage commissioning projects, record field measurements, and generate reports — all in one place.
          </p>

          {/* Stats strip */}
          <div className="flex gap-6 pt-4">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon size={14} className="text-primary" />
                <span className="font-mono text-sm font-semibold text-foreground">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer tags */}
        <div className="relative z-10 flex gap-2 animate-fade-up" style={{ animationDelay: '160ms' }}>
          {['Power Systems', 'Field Testing', 'Commissioning'].map(tag => (
            <span key={tag} className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-border text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right panel — sign in form ── */}
      <div className="relative z-10 flex items-center justify-center border-l border-border bg-card/60 backdrop-blur-sm p-10">
        <div className="w-full max-w-sm">
          <Tabs defaultValue="signin" className="w-full">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">Welcome back</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Sign in to your account to continue</p>
            </div>

            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <div className="space-y-4">
                <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogleSignIn} disabled={oauthLoading || isLoading}>
                  <GoogleIcon />
                  {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="engineer@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || oauthLoading}>
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in…</> : 'Sign In'}
                  </Button>
                  <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setForgotEmail(email); setForgotOpen(true); }}>
                    Forgot password?
                  </button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="space-y-4">
                <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogleSignIn} disabled={oauthLoading || isLoading}>
                  <GoogleIcon />
                  {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="engineer@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || oauthLoading}>
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : 'Create Account'}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
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
