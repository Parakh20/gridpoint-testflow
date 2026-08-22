import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  oauth_provisioning: string;
  allowed_domains: string[];
}

interface CompanyContextType {
  company: Company | null;
  companySlug: string | null;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);

  // Single-domain architecture: the whole app is served from one host
  // (app.optimustesting.com) for every tenant, so the company is resolved
  // from the signed-in user's profile rather than the hostname. Before
  // sign-in there is no company — the Auth page renders unbranded, which is
  // expected and is why `company` is nullable here.
  useEffect(() => {
    let cancelled = false;

    async function resolveCompany(userId: string | undefined) {
      if (!userId) {
        if (!cancelled) { setCompany(null); setCompanySlug(null); setLoading(false); }
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (!profile?.company_id) {
        // New OAuth user awaiting provisioning, or a user with no company
        // yet — AuthContext's "role pending" flow owns this state.
        setCompany(null);
        setCompanySlug(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, is_active, oauth_provisioning, allowed_domains')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setCompany(null);
        setCompanySlug(null);
      } else if (!data.is_active) {
        setCompanySlug(data.slug);
        setSuspended(true);
        supabase.auth.signOut();
      } else {
        setCompany(data);
        setCompanySlug(data.slug);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveCompany(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      resolveCompany(session?.user?.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (suspended && companySlug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-7 w-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Workspace Suspended</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Access to <span className="font-mono text-foreground">{companySlug}</span> has been
              suspended. Please contact your administrator or TestFlow support to restore access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CompanyContext.Provider value={{ company, companySlug, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
