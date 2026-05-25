import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CompanyNotFound from '@/pages/CompanyNotFound';

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

function getSubdomainSlug(): string | null {
  const host = window.location.hostname; // e.g. "powergrid.testflow.io" or "localhost"
  const parts = host.split('.');
  // On localhost or bare domain (testflow.io), no company slug
  if (parts.length < 3) return null;
  const subdomain = parts[0];
  if (subdomain === 'www') return null;
  return subdomain;
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    const slug = getSubdomainSlug();
    setCompanySlug(slug);

    if (!slug) {
      setLoading(false);
      return;
    }

    supabase
      .from('companies')
      .select('id, name, slug, is_active, oauth_provisioning, allowed_domains')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          // If the error is "column does not exist" (migration pending), retry with
          // base columns only so tenants can still log in.
          if (error?.message?.includes('column') || error?.code === '42703') {
            supabase
              .from('companies')
              .select('id, name, slug, is_active')
              .eq('slug', slug)
              .single()
              .then(({ data: d2, error: e2 }) => {
                if (e2 || !d2) { setNotFound(true); }
                else if (!d2.is_active) { setSuspended(true); supabase.auth.signOut(); }
                else { setCompany({ ...d2, oauth_provisioning: 'off', allowed_domains: [] }); }
                setLoading(false);
              });
            return;
          }
          setNotFound(true);
        } else if (!data.is_active) {
          setSuspended(true);
          supabase.auth.signOut();
        } else {
          setCompany(data);
        }
        setLoading(false);
      });
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

  if (notFound && companySlug) {
    return <CompanyNotFound slug={companySlug} />;
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
