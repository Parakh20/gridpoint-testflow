import { useEffect, useRef, useState } from 'react';
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
import { StatusBadge } from '@/components/StatusBadge';
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
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface TenantUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface TenantProject {
  id: string;
  project_number: string;
  site_name: string;
  status: string;
  created_at: string;
}

interface CompanyDetail {
  users: TenantUser[];
  projects: TenantProject[];
}

interface CreatedTenant {
  workspaceUrl: string;
  adminEmail: string;
  password: string;
  slug: string;
}

const ONBOARDING_STEPS = [
  `Add https://{slug}.${BASE_DOMAIN} to supabase/functions/_shared/cors.ts ALLOWED_ORIGINS → push to main (triggers CI deploy)`,
  'Send workspace URL + credentials to client',
];

const ROLE_BADGE: Record<string, string> = {
  SUPERADMIN: 'bg-red-500/15 text-red-400 border-red-500/30',
  GM:         'bg-blue-500/15 text-blue-400 border-blue-500/30',
  SUPERVISOR: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  ENGINEER:   'bg-green-500/15 text-green-400 border-green-500/30',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide font-semibold',
      ROLE_BADGE[role] ?? 'bg-muted text-muted-foreground border-border'
    )}>
      {role}
    </span>
  );
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 inline-flex items-center rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Secure platform data fetcher ────────────────────────────────────────────
const platformFetch = async (action: string, payload?: object) => {
  const token = import.meta.env.VITE_PLATFORM_ADMIN_TOKEN;
  if (!token) throw new Error('VITE_PLATFORM_ADMIN_TOKEN is not configured');
  const { data, error } = await supabase.functions.invoke('platform-admin-data', {
    body: { action, payload },
    headers: { 'X-Platform-Token': token },
  });
  if (error) throw error;
  return data;
};

export default function PlatformDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats>({ companies: 0, users: 0, activeProjects: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const tokenMissing = !import.meta.env.VITE_PLATFORM_ADMIN_TOKEN;

  // Expandable row state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const detailCache = useRef<Map<string, CompanyDetail>>(new Map());

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Success card — shown once after creation
  const [createdTenant, setCreatedTenant] = useState<CreatedTenant | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (sessionStorage.getItem('platform_authed') !== 'true') {
      navigate('/', { replace: true });
      return;
    }
    if (!import.meta.env.VITE_PLATFORM_ADMIN_TOKEN) {
      console.error('[PlatformDashboard] VITE_PLATFORM_ADMIN_TOKEN is not set — data fetching skipped');
      setLoadingData(false);
      return;
    }
    fetchAll();
  }, [navigate]);

  const fetchAll = async () => {
    setLoadingData(true);
    try {
      const [statsData, companiesData] = await Promise.all([
        platformFetch('get_stats'),
        platformFetch('get_all_companies'),
      ]);
      setStats({
        companies: statsData.total_companies ?? 0,
        users: statsData.total_users ?? 0,
        activeProjects: statsData.active_projects ?? 0,
      });
      setCompanies(companiesData?.companies ?? []);
    } catch (err: any) {
      console.error('[PlatformDashboard] fetch error:', err);
      toast({ variant: 'destructive', title: 'Failed to load data', description: err.message });
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleExpand = async (company: Company) => {
    if (expandedId === company.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(company.id);

    if (detailCache.current.has(company.id)) return;

    setLoadingDetailId(company.id);
    try {
      const raw = await platformFetch('get_company_detail', { company_id: company.id });
      const detail: CompanyDetail = {
        users: Array.isArray(raw?.users) ? raw.users : [],
        projects: Array.isArray(raw?.projects) ? raw.projects : [],
      };
      detailCache.current.set(company.id, detail);
    } catch (err: any) {
      console.error('[PlatformDashboard] detail fetch error:', err);
      toast({ variant: 'destructive', title: 'Failed to load company details', description: err.message });
      setExpandedId(null);
    } finally {
      setLoadingDetailId(null);
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

  const resetForm = () => {
    setCompanyName('');
    setSlug('');
    setSlugManual(false);
    setAdminFullName('');
    setAdminEmail('');
    setAdminPassword('');
    setShowPassword(false);
  };

  const slugValid = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]$/.test(slug);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!slugValid) {
      toast({ variant: 'destructive', title: 'Invalid slug', description: 'Lowercase alphanumeric and hyphens only.' });
      return;
    }
    if (adminPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Minimum 8 characters required.' });
      return;
    }

    setAddLoading(true);
    setCreatedTenant(null);
    try {
      const platformToken = import.meta.env.VITE_PLATFORM_ADMIN_TOKEN;
      const { data, error } = await supabase.functions.invoke('create-tenant', {
        body: {
          name: companyName.trim(),
          slug: slug.trim(),
          email: adminEmail.trim(),
          password: adminPassword,
          full_name: adminFullName.trim(),
        },
        headers: { 'X-Platform-Token': platformToken ?? '' },
      });

      if (error) throw error;

      if (data?.error) {
        let description = data.message ?? data.error;
        if (data.error === 'slug_taken') description = `Slug "${slug}" is already in use. Choose a different one.`;
        if (data.error === 'email_taken') description = `${adminEmail} is already registered. Use a different email.`;
        toast({ variant: 'destructive', title: 'Creation failed', description });
        return;
      }

      const workspaceUrl = `https://${slug}.${BASE_DOMAIN}`;
      setCreatedTenant({ workspaceUrl, adminEmail: adminEmail.trim(), password: adminPassword, slug: slug.trim() });
      resetForm();
      detailCache.current.clear();
      await fetchAll();
    } catch (err: any) {
      console.error('[PlatformDashboard] create-tenant error:', err);
      toast({ variant: 'destructive', title: 'Failed to create tenant', description: err.message });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (company: Company) => {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', company.id);
      if (error) throw error;
      detailCache.current.delete(company.id);
      if (expandedId === company.id) setExpandedId(null);
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

        {/* Env configuration banner */}
        {tokenMissing && (
          <div className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">VITE_PLATFORM_ADMIN_TOKEN is not configured</p>
              <p className="mt-0.5 text-xs text-yellow-400/80">
                Add it to <code className="font-mono">frontend/.env</code> (local) and Vercel → Environment Variables → Production, then redeploy. Stats and company data will show zeros until this is set.
              </p>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Building2, label: 'Total Companies', value: stats.companies },
            { icon: Users,     label: 'Total Users',     value: stats.users },
            { icon: Activity,  label: 'Active Projects', value: stats.activeProjects },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="bg-card/60 backdrop-blur border-border">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-2xl font-semibold text-foreground leading-none">
                    {loadingData
                      ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      : value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">

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
                  No companies yet. Create one below.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-8" />
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
                      const isExpanded = expandedId === company.id;
                      const isLoadingDetail = loadingDetailId === company.id;
                      const detail = detailCache.current.get(company.id);

                      return (
                        <>
                          <TableRow key={company.id} className="border-border">
                            {/* Expand toggle */}
                            <TableCell className="pl-3 pr-0">
                              <button
                                type="button"
                                onClick={() => handleToggleExpand(company)}
                                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isLoadingDetail
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : isExpanded
                                    ? <ChevronDown className="h-3.5 w-3.5" />
                                    : <ChevronRight className="h-3.5 w-3.5" />
                                }
                              </button>
                            </TableCell>
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
                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
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
                                        This permanently removes the company record. All associated users
                                        and projects must be deleted first — otherwise this will fail with
                                        a foreign key error.
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

                          {/* Expanded detail row */}
                          {isExpanded && (
                            <TableRow key={`${company.id}-detail`} className="border-border bg-muted/20 hover:bg-muted/20">
                              <TableCell colSpan={6} className="p-0">
                                {isLoadingDetail || !detail ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                  </div>
                                ) : (
                                  <div className="px-8 py-4 space-y-5">

                                    {/* Users sub-table */}
                                    <div>
                                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                        <Users className="h-3 w-3" /> Users ({(detail.users ?? []).length})
                                      </p>
                                      {(detail.users ?? []).length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">No users yet</p>
                                      ) : (
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-border text-muted-foreground">
                                              <th className="pb-1.5 text-left font-medium">Full Name</th>
                                              <th className="pb-1.5 text-left font-medium">Email</th>
                                              <th className="pb-1.5 text-left font-medium">Role</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(detail.users ?? []).map(u => (
                                              <tr key={u.id} className="border-b border-border/50 last:border-0">
                                                <td className="py-1.5 text-foreground">{u.full_name || '—'}</td>
                                                <td className="py-1.5 text-muted-foreground font-mono">{u.email}</td>
                                                <td className="py-1.5"><RoleBadge role={u.role} /></td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>

                                    {/* Projects sub-table */}
                                    <div>
                                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                        <Activity className="h-3 w-3" /> Projects ({(detail.projects ?? []).length})
                                      </p>
                                      {(detail.projects ?? []).length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">No projects yet</p>
                                      ) : (
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-border text-muted-foreground">
                                              <th className="pb-1.5 text-left font-medium">Project #</th>
                                              <th className="pb-1.5 text-left font-medium">Site Name</th>
                                              <th className="pb-1.5 text-left font-medium">Status</th>
                                              <th className="pb-1.5 text-left font-medium">Created</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(detail.projects ?? []).map(p => (
                                              <tr key={p.id} className="border-b border-border/50 last:border-0">
                                                <td className="py-1.5 font-mono text-foreground">{p.project_number}</td>
                                                <td className="py-1.5 text-foreground">{p.site_name}</td>
                                                <td className="py-1.5"><StatusBadge status={p.status} /></td>
                                                <td className="py-1.5 text-muted-foreground">
                                                  {new Date(p.created_at).toLocaleDateString('en-GB', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                  })}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>

                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">

            {/* Success card — shown once after creation */}
            {createdTenant && (
              <Card className="border-green-500/40 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-green-400">
                    <Check className="h-4 w-4" />
                    Tenant Created Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 rounded-lg border border-border bg-card/60 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Workspace</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={createdTenant.workspaceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-primary hover:underline"
                        >
                          {createdTenant.workspaceUrl}
                        </a>
                        <CopyButton text={createdTenant.workspaceUrl} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Admin Email</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-foreground">{createdTenant.adminEmail}</span>
                        <CopyButton text={createdTenant.adminEmail} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Password</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-foreground">{createdTenant.password}</span>
                        <CopyButton text={createdTenant.password} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Save these credentials — the password will not be shown again.</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setCreatedTenant(null)}
                  >
                    Dismiss
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Create Company + Admin form */}
            <Card className="bg-card/60 backdrop-blur border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Create Company + Admin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTenant} className="space-y-5">

                  {/* Section 1: Company Details */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Company Details
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="company-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                      <Label htmlFor="company-slug" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                        <p className={`text-[11px] font-mono truncate ${slugValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                          {slugValid
                            ? `→ https://${slug}.${BASE_DOMAIN}`
                            : 'Slug must start/end with alphanumeric and contain only a–z, 0–9, hyphens'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Section 2: SUPERADMIN Account */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      SUPERADMIN Account
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Full Name
                      </Label>
                      <Input
                        id="admin-name"
                        placeholder="Jane Smith"
                        value={adminFullName}
                        onChange={e => setAdminFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email
                      </Label>
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@acmecorp.com"
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="admin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          required
                          minLength={8}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={addLoading || !companyName || !slug || !slugValid || !adminFullName || !adminEmail || adminPassword.length < 8}
                  >
                    {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {addLoading ? 'Creating…' : 'Create Company + Admin'}
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
                  Manual steps required after creating a company:
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
