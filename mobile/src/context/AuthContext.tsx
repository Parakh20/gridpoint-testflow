import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { setUserContext } from '@/lib/monitoring';
import { highestRole, type AppRole } from '@testflow/shared';

WebBrowser.maybeCompleteAuthSession();

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
  oauthPending: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthPending, setOauthPending] = useState(false);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
    setOauthPending(false);
    setUserContext(null);
  }, []);

  const provisionOAuthUser = useCallback(async (accessToken: string, userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('provision-oauth-user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error || !data) {
        await supabase.auth.signOut();
        setRole(null); setProfile(null);
        setLoading(false);
        return;
      }

      const errCode = data.error as string | undefined;
      if (errCode) {
        await supabase.auth.signOut();
        setRole(null); setProfile(null);
        setLoading(false);
        return;
      }

      if (data.status === 'pending') {
        setOauthPending(true);
        setLoading(false);
        return;
      }

      // provisioned — fetch role/profile normally (trigger re-run via session effect below)
      // The session is already set; the deferred useEffect will pick it up.
    } catch {
      setLoading(false);
    }
  }, []);

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
        setOauthPending(false);
        setLoading(false);
      }
      if (event === 'TOKEN_REFRESHED' && !s) {
        setRole(null);
        setProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const isGoogle = session.user.app_metadata?.provider === 'google';
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;

      if (isGoogle) {
        await provisionOAuthUser(session.access_token, session.user.id);
        return;
      }

      try {
        const [rolesRes, profRes] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', session.user.id),
          supabase
            .from('profiles')
            .select('name, email, company_id, companies(name)')
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
              full_name: profRow.name ?? null,
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
        console.warn('[AuthContext] role/profile fetch failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [session?.user?.id, provisionOAuthUser]);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    try {
      const redirectUri = makeRedirectUri({ scheme: 'testflow', path: 'auth/callback' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (error || !data.url) return { error: error?.message ?? 'Failed to get OAuth URL' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type !== 'success') return { error: null }; // user cancelled

      const url = result.url;
      const params = new URL(url);
      const code = params.searchParams.get('code');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) return { error: exchangeError.message };
      }

      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? 'Google sign-in failed' };
    }
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
        oauthPending,
        signIn,
        signInWithGoogle,
        signOut,
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

