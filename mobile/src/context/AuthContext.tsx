import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, PanResponder, type PanResponderInstance } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setUserContext } from '@/lib/monitoring';
import { highestRole, type AppRole } from '@testflow/shared';

type Role = AppRole | null;

type Profile = {
  full_name: string | null;
  email: string | null;
  company_id: string | null;
  company_name: string | null;
};

type AuthState = {
  session: Session | null;
  userId: string | null;
  email: string | null;
  role: Role;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  touch: () => void;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
    setUserContext(null);
  }, []);

  const touch = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (!session) return;
    idleTimer.current = setTimeout(() => {
      void signOut();
    }, IDLE_TIMEOUT_MS);
  }, [session, signOut]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (!s) {
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
      // TOKEN_REFRESHED with null session means refresh failed (e.g. revoked, expired beyond grace).
      // SIGNED_OUT covers explicit + server-side invalidations. USER_DELETED handled implicitly.
      if (event === 'TOKEN_REFRESHED' && !s) {
        setRole(null);
        setProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    // Defer fetches off the auth callback tick (same deadlock workaround as the web app).
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        // user_roles is UNIQUE(user_id, role) — a single user CAN have multiple roles.
        // Don't use .maybeSingle() (it throws on >1 row). Fetch the array and pick the
        // highest-privilege one for the role-gate decision.
        const [rolesRes, profRes] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', session.user.id),
          supabase
            .from('profiles')
            .select('full_name, email, company_id, companies(name)')
            .eq('id', session.user.id)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const rolesData = (rolesRes.data ?? []) as Array<{ role: string }>;
        const best = highestRole(rolesData.map((r) => r.role));

        setRole(best);

        const profRow = profRes.data as any;
        const companyName = profRow?.companies?.name ?? null;
        const newProfile = profRow
          ? {
              full_name: profRow.full_name ?? null,
              email: profRow.email ?? session.user.email ?? null,
              company_id: profRow.company_id ?? null,
              company_name: companyName,
            }
          : null;
        setProfile(newProfile);
        setUserContext({
          id: session.user.id,
          email: newProfile?.email ?? session.user.email ?? null,
          role: best ?? null,
          companyId: newProfile?.company_id ?? null,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[AuthContext] role/profile fetch failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [session?.user?.id]);

  // Idle timeout — start when session exists, restart on touch().
  useEffect(() => {
    if (!session) {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      return;
    }
    touch();
    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') touch();
    });
    return () => {
      appSub.remove();
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [session, touch]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  return (
    <AuthCtx.Provider
      value={{
        session,
        userId: session?.user?.id ?? null,
        email: profile?.email ?? session?.user?.email ?? null,
        role,
        profile,
        loading,
        signIn,
        signOut,
        touch,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Wraps children in a PanResponder that resets the idle timer on any touch.
 * Doesn't block child gestures — only observes.
 */
export function useIdleResetResponder(): PanResponderInstance {
  const { touch } = useAuth();
  const ref = useRef<PanResponderInstance | null>(null);
  if (!ref.current) {
    ref.current = PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        touch();
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => {
        touch();
        return false;
      },
    });
  }
  return ref.current;
}
