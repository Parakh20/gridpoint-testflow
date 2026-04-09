import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap } from 'lucide-react';

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

  // Background: animated grid dot pattern + radial gradient overlay
  const pageBg = (
    <div className="fixed inset-0 -z-10 overflow-hidden dark:bg-[#0a0e17] bg-slate-50">
      {/* Grid dots */}
      <div
        className="absolute inset-0 opacity-[0.15] dark:opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Center radial glow — dark only */}
      <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_60%,#1d3461_0%,transparent_70%)] pointer-events-none" />
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full dark:bg-blue-500/5 bg-blue-500/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full dark:bg-cyan-500/5 bg-cyan-400/10 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );

  if (isResetMode) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        {pageBg}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow-blue">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-foreground">TestFlow</p>
                <p className="text-xs text-muted-foreground">Set new password</p>
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
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {pageBg}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Glass card */}
        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-border">
            <div className="flex items-center gap-3 mb-1">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary"
                animate={{ boxShadow: ['0 0 12px #3b82f640', '0 0 28px #3b82f660', '0 0 12px #3b82f640'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Zap className="h-5 w-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">TestFlow</h1>
                <p className="text-xs text-muted-foreground">Electrical Testing Management</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={oauthLoading || isLoading}
                  >
                    <GoogleIcon />
                    {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
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
                    <button
                      type="button"
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                    >
                      Forgot password?
                    </button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={oauthLoading || isLoading}
                  >
                    <GoogleIcon />
                    {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
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
      </motion.div>

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
