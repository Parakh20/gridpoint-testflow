import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Zap,
  ExternalLink,
  Trash2,
  Plus,
  Building2,
  Users,
  Activity,
  LogOut,
  CheckSquare,
} from 'lucide-react';

const BASE_DOMAIN = 'optimustesting.com';

interface Company {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface Stats {
  companies: number;
  users: number;
  activeProjects: number;
}

const ONBOARDING_STEPS = [
  'Create SUPERADMIN user: Supabase Dashboard → Auth → Users → Create user',
  "Run SQL: UPDATE profiles SET company_id = '<id>' WHERE id = '<user_id>'",
  "Run SQL: INSERT INTO user_roles (user_id, role, company_id) VALUES ('<uid>', 'SUPERADMIN', '<cid>')",
  `Add https://{slug}.${BASE_DOMAIN} to supabase/functions/_shared/cors.ts → redeploy`,
  'Send workspace URL + credentials to client',
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function PlatformDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({ companies: 0, users: 0, activeProjects: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (sessionStorage.getItem('platform_authed') !== 'true') {
      navigate('/', { replace: true });
      return;
    }
    fetchAll();
  }, [navigate]);

  const fetchAll = async () => {
    setLoadingData(true);
    try {
      const [companiesRes, usersRes, projectsRes] = await Promise.all([
        supabase.from('companies').select('id, name, slug, created_at').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      ]);

      if (companiesRes.error) throw companiesRes.error;
      setCompanies(companiesRes.data ?? []);
      setStats({
        companies: companiesRes.data?.length ?? 0,
        users: usersRes.count ?? 0,
        activeProjects: projectsRes.count ?? 0,
      });
    } catch (err: any) {
      console.error('[PlatformDashboard] fetch error:', err);
      toast({ variant: 'destructive', title: 'Failed to load data', description: err.message });
    } finally {
      setLoadingData(false);
    }
  };

  const handleNameChange = (name: string) => {
    setCompanyName(name);
    if (!slugManual) setSlug(generateSlug(name));
  };

  const handleSlugChange = (val: string) => {
    setSlugManual(true);
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !slug.trim()) return;

    const slugValid = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]$/.test(slug);
    if (!slugValid) {
      toast({ variant: 'destructive', title: 'Invalid slug', description: 'Slug must be lowercase alphanumeric with hyphens only.' });
      return;
    }

    setAddLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .insert({ name: companyName.trim(), slug: slug.trim() });

      if (error) throw error;

      const workspaceUrl = `https://${slug}.${BASE_DOMAIN}`;
      toast({
        title: 'Company created',
        description: `Workspace: ${workspaceUrl}`,
      });
      setCompanyName('');
      setSlug('');
      setSlugManual(false);
      await fetchAll();
    } catch (err: any) {
      console.error('[PlatformDashboard] add company error:', err);
      toast({ variant: 'destructive', title: 'Failed to create company', description: err.message });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (company: Company) => {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', company.id);
      if (error) throw error;
      toast({ title: 'Company deleted', description: `${company.name} has been removed.` });
      await fetchAll();
    } catch (err: any) {
      console.error('[PlatformDashboard] delete error:', err);
      toast({
        variant: 'destructive',
        title: 'Cannot delete company',
        description: err.message.includes('foreign key') || err.message.includes('violates')
          ? 'Remove all users and projects for this company first.'
          : err.message,
      });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('platform_authed');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="tf-bg-grid" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-glow-blue">
              <Zap className="h-4.5 w-4.5 text-primary-foreground" />
              <span className="absolute -inset-1 rounded-xl bg-primary/30 blur-md -z-10" />
            </div>
            <div>
              <p className="font-bold text-foreground leading-none">TestFlow</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Platform Admin
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8 space-y-8">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Building2, label: 'Total Companies', value: stats.companies },
            { icon: Users, label: 'Total Users', value: stats.users },
            { icon: Activity, label: 'Active Projects', value: stats.activeProjects },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="bg-card/60 backdrop-blur border-border">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-2xl font-semibold text-foreground leading-none">
                    {loadingData ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

          {/* Companies table */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Tenant Companies</h2>
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur overflow-hidden">
              {loadingData ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : companies.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No companies yet. Add one below.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Slug</TableHead>
                      <TableHead className="text-muted-foreground">Workspace URL</TableHead>
                      <TableHead className="text-muted-foreground">Created</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map(company => {
                      const workspaceUrl = `https://${company.slug}.${BASE_DOMAIN}`;
                      return (
                        <TableRow key={company.id} className="border-border">
                          <TableCell className="font-medium text-foreground">{company.name}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {company.slug}
                            </span>
                          </TableCell>
                          <TableCell>
                            <a
                              href={workspaceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {workspaceUrl}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(company.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                asChild
                              >
                                <a href={workspaceUrl} target="_blank" rel="noopener noreferrer">
                                  Open <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {company.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This permanently removes the company record. All associated users and
                                      projects must be deleted first — otherwise this will fail with a
                                      foreign key error.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(company)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Right column: Add company + Onboarding checklist */}
          <div className="space-y-6">

            {/* Add company form */}
            <Card className="bg-card/60 backdrop-blur border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Add Company
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCompany} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="company-name"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Company Name
                    </Label>
                    <Input
                      id="company-name"
                      placeholder="Acme Power Corp"
                      value={companyName}
                      onChange={e => handleNameChange(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="company-slug"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Slug
                    </Label>
                    <Input
                      id="company-slug"
                      placeholder="acme-power"
                      value={slug}
                      onChange={e => handleSlugChange(e.target.value)}
                      required
                      className="font-mono text-sm"
                    />
                    {slug && (
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        → https://{slug}.{BASE_DOMAIN}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={addLoading || !companyName || !slug}>
                    {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {addLoading ? 'Creating…' : 'Create Company'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Onboarding checklist */}
            <Card className="bg-card/60 backdrop-blur border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Post-creation Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Manual steps required after adding a company:
                </p>
                <ol className="space-y-2.5">
                  {ONBOARDING_STEPS.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-foreground/80">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border text-[9px] font-mono text-muted-foreground">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
