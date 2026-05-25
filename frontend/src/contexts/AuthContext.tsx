import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  userName: string | null;
  loading: boolean;
  companyMismatch: boolean;
  accountDisabled: boolean;
  oauthPending: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyMismatch, setCompanyMismatch] = useState(false);
  const [accountDisabled, setAccountDisabled] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const navigate = useNavigate();
  const { company } = useCompany();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/auth?reset=true');
          setLoading(false);
          return;
        }
        if (session?.user) {
          // setTimeout defers the Supabase call to avoid a deadlock inside the
          // onAuthStateChange callback (Supabase holds a lock during this event).
          const isGoogle = session.user.app_metadata?.provider === 'google';
          setTimeout(() => isGoogle ? provisionOAuthUser(session.user.id) : fetchUserRole(session.user.id), 0);
        } else {
          setUserRole(null);
          setUserName(null);
          setOauthPending(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const isGoogle = session.user.app_metadata?.provider === 'google';
        isGoogle ? provisionOAuthUser(session.user.id) : fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const [roleResult, profileResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).single(),
        supabase.from('profiles').select('company_id, is_active, name').eq('id', userId).single(),
      ]);

      const userCompanyId = profileResult.data?.company_id ?? null;
      setUserName(profileResult.data?.name ?? null);

      // Block disabled accounts before anything else
      if (profileResult.data?.is_active === false) {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setUserRole(null);
        setAccountDisabled(true);
        navigate('/auth');
        return;
      }

      // When a magic link is being processed, the session may not yet be fully
      // established. Give Supabase a moment to complete the token exchange before
      // running the mismatch check, so the correct user is evaluated.
      const isMagicLinkCallback =
        window.location.hash.includes('access_token') ||
        window.location.search.includes('token_hash') ||
        window.location.search.includes('type=magiclink') ||
        window.location.search.includes('type=recovery');
      if (isMagicLinkCallback) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Company-scoped login guard: if a subdomain company is resolved (not localhost/dev)
      // and the user's profile company_id does not match, reject the session immediately.
      // Skip the check when userCompanyId is null — that user has no company yet and is
      // handled by the "role pending" flow rather than a mismatch rejection.
      // Also skip during magic link callbacks — the session is still being established.
      if (company !== null && userCompanyId !== null && userCompanyId !== company.id && !isMagicLinkCallback) {
        console.error('[AuthContext] Company mismatch — user does not belong to this workspace. Signing out.');
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setUserRole(null);
        setCompanyMismatch(true);
        navigate('/auth?error=wrong_company');
        return;
      }

      setUserRole(roleResult.data && !roleResult.error ? roleResult.data.role : null);
    } catch {
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const provisionOAuthUser = async (userId: string) => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) { setLoading(false); return; }

      const { data, error } = await supabase.functions.invoke('provision-oauth-user', {
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });

      if (error || !data) {
        console.error('[AuthContext] OAuth provision error', error);
        await supabase.auth.signOut();
        setUser(null); setSession(null); setUserRole(null);
        setAccountDisabled(true);
        navigate('/auth');
        return;
      }

      const errCode = data.error as string | undefined;
      if (errCode) {
        await supabase.auth.signOut();
        setUser(null); setSession(null); setUserRole(null);
        if (errCode === 'account_disabled') {
          setAccountDisabled(true);
        } else if (errCode === 'no_company_match') {
          setCompanyMismatch(true);
          navigate('/auth?error=no_google_company');
        } else if (errCode === 'oauth_disabled') {
          setCompanyMismatch(true);
          navigate('/auth?error=oauth_disabled');
        } else {
          navigate('/auth');
        }
        setLoading(false);
        return;
      }

      if (data.status === 'pending') {
        setOauthPending(true);
        setLoading(false);
        navigate('/auth');
        return;
      }

      // status === 'provisioned' — fetch role normally
      await fetchUserRole(userId);
    } catch {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setUserName(null);
    navigate('/auth');
  };

  // ── Idle timeout: auto-logout after 30 minutes of no user activity ────────
  // Standard B2B hygiene — protects against an unattended workstation in a
  // shared office. Reset on any mouse/keyboard/touch interaction.
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) return;

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        console.info('[AuthContext] Idle timeout — signing out');
        signOut();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointermove'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, userRole, userName, loading, companyMismatch, accountDisabled, oauthPending, signIn, signInWithGoogle, signOut, resetPasswordForEmail, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
