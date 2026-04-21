import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CompanyNotFound from '@/pages/CompanyNotFound';

interface Company {
  id: string;
  name: string;
  slug: string;
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

  useEffect(() => {
    const slug = getSubdomainSlug();
    setCompanySlug(slug);

    if (!slug) {
      // localhost or bare domain — dev mode or landing page
      setLoading(false);
      return;
    }

    supabase
      .from('companies')
      .select('id, name, slug')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
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
