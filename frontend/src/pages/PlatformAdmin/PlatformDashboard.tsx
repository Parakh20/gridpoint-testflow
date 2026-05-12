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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  KeyRound,
  LogIn,
  PowerOff,
  Power,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE_DOMAIN = 'optimustesting.com';

interface Company {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  is_active: boolean;
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

interface GlobalUser {
  id: string;
  full_name: string;
  email: string;
  company_id: string | null;
  company_name: string | null;
  company_slug: string | null;
  role: string;
}

interface ResetLinkInfo {
  email: string;
  link: string;
}

interface MagicLinkInfo {
  email: string;
  link: string;
  companyName: string;
  slug: string;
}

const ONBOARDING_STEPS = [
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

  // All Users tab
  const [activeTab, setActiveTab] = useState('companies');
  const [allUsers, setAllUsers] = useState<GlobalUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const usersLoaded = useRef(false);

  // Reset password dialog
  const [resetLinkInfo, setResetLinkInfo] = useState<ResetLinkInfo | null>(null);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);

  // Suspend/activate toggle loading state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Enter as Admin dialog
  const [enterConfirmCompany, setEnterConfirmCompany] = useState<Company | null>(null);
  const [enteringCompanyId, setEnteringCompanyId] = useState<string | null>(null);
  const [magicLinkInfo, setMagicLinkInfo] = useState<MagicLinkInfo | null>(null);

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
      const result = await platformFetch('delete_company', { company_id: company.id });
      if (result?.error) throw new Error(result.message ?? result.error);
      detailCache.current.delete(company.id);
      if (expandedId === company.id) setExpandedId(null);
      toast({
        title: 'Company deleted',
        description: `${company.name} and all its users/projects have been permanently removed.`,
      });
      await fetchAll();
    } catch (err: any) {
      console.error('[PlatformDashboard] delete error:', err);
      toast({ variant: 'destructive', title: 'Failed to delete company', description: err.message });
    }
  };

  const handleToggleStatus = async (company: Company) => {
    setTogglingId(company.id);
    try {
      const newStatus = !company.is_active;
      const result = await platformFetch('toggle_company_status', {
        company_id: company.id,
        is_active: newStatus,
      });
      if (result?.error) throw new Error(result.message ?? result.error);
      setCompanies(prev =>
        prev.map(c => c.id === company.id ? { ...c, is_active: newStatus } : c)
      );
      toast({
        title: newStatus ? 'Company activated' : 'Company suspended',
        description: newStatus
          ? `${company.name} is now active. Users can log in.`
          : `${company.name} has been suspended. All users will be blocked from logging in.`,
      });
    } catch (err: any) {
      console.error('[PlatformDashboard] toggle status error:', err);
      toast({ variant: 'destructive', title: 'Failed to update status', description: err.message });
    } finally {
      setTogglingId(null);
    }
  };

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await platformFetch('get_all_users');
      setAllUsers(Array.isArray(data?.users) ? data.users : []);
      usersLoaded.current = true;
    } catch (err: any) {
      console.error('[PlatformDashboard] fetch users error:', err);
      toast({ variant: 'destructive', title: 'Failed to load users', description: err.message });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'users' && !usersLoaded.current) {
      fetchAllUsers();
    }
  };

  const handleResetPassword = async (email: string) => {
    setResettingEmail(email);
    try {
      const data = await platformFetch('reset_user_password', { email });
      if (data?.error) throw new Error(data.message ?? data.error);
      setResetLinkInfo({ email, link: data.link });
      toast({ title: 'Reset link generated', description: `Password reset link created for ${email}` });
    } catch (err: any) {
      console.error('[PlatformDashboard] reset password error:', err);
      toast({ variant: 'destructive', title: 'Failed to generate reset link', description: err.message });
    } finally {
      setResettingEmail(null);
    }
  };

  const handleEnterAsAdmin = async (company: Company) => {
    setEnteringCompanyId(company.id);
    try {
      const data = await platformFetch('get_company_magic_link', {
        company_id: company.id,
        slug: company.slug,
      });
      if (data?.error) {
        const description = data.error === 'no_superadmin'
          ? 'No SUPERADMIN found for this company. Create one using the Create Company + Admin form.'
          : (data.message ?? data.error);
        toast({ variant: 'destructive', title: 'Cannot enter workspace', description });
        return;
      }
      setMagicLinkInfo({
        email: data.email,
        link: data.magic_link,
        companyName: company.name,
        slug: company.slug,
      });
    } catch (err: any) {
      console.error('[PlatformDashboard] enter as admin error:', err);
      toast({ variant: 'destructive', title: 'Failed to enter workspace', description: err.message });
    } finally {
      setEnteringCompanyId(null);
      setEnterConfirmCompany(null);
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

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-3.5 w-3.5" /> Companies
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-3.5 w-3.5" /> All Users
            </TabsTrigger>
          </TabsList>

          {/* ── Companies tab ─────────────────────────────────────────────── */}
          <TabsContent value="companies">
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
                      <TableHead className="text-muted-foreground">Status</TableHead>
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
                              <span className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                company.is_active
                                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                  : 'border-red-500/30 bg-red-500/10 text-red-400'
                              )}>
                                <span className={cn('h-1.5 w-1.5 rounded-full', company.is_active ? 'bg-green-400' : 'bg-red-400')} />
                                {company.is_active ? 'Active' : 'Suspended'}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                  onClick={() => setEnterConfirmCompany(company)}
                                >
                                  <LogIn className="h-3 w-3" />
                                  Enter as Admin
                                </Button>
                                {/* Suspend / Activate */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={togglingId === company.id}
                                      className={cn(
                                        'h-8 gap-1.5 text-xs',
                                        company.is_active
                                          ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                                          : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                                      )}
                                    >
                                      {togglingId === company.id
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : company.is_active
                                          ? <PowerOff className="h-3 w-3" />
                                          : <Power className="h-3 w-3" />
                                      }
                                      {company.is_active ? 'Suspend' : 'Activate'}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        {company.is_active ? 'Suspend' : 'Activate'} {company.name}?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {company.is_active
                                          ? 'All users will be immediately signed out and blocked from logging in. Use this when a client has payment issues.'
                                          : 'This will restore access for all users of this company.'}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleToggleStatus(company)}
                                        className={company.is_active
                                          ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                                          : 'bg-green-600 hover:bg-green-500 text-white'}
                                      >
                                        {company.is_active ? 'Suspend' : 'Activate'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                {/* Delete */}
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
                                        This permanently deletes the company, all its users, all projects,
                                        and all test data. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(company)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        Delete Everything
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
                              <TableCell colSpan={7} className="p-0">
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
          </TabsContent>

          {/* ── All Users tab ──────────────────────────────────────────────── */}
          <TabsContent value="users">
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur overflow-hidden">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : allUsers.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No users found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Full Name</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Company</TableHead>
                      <TableHead className="text-muted-foreground">Role</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map(user => (
                      <TableRow key={user.id} className="border-border">
                        <TableCell className="font-medium text-foreground">
                          {user.full_name || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          {user.company_slug ? (
                            <a
                              href={`https://${user.company_slug}.${BASE_DOMAIN}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {user.company_name}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No company</span>
                          )}
                        </TableCell>
                        <TableCell><RoleBadge role={user.role} /></TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            disabled={resettingEmail === user.email}
                            onClick={() => handleResetPassword(user.email)}
                          >
                            {resettingEmail === user.email
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <KeyRound className="h-3.5 w-3.5" />
                            }
                            Reset Password
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

        </Tabs>

        {/* ── Reset Password link dialog ──────────────────────────────────── */}
        <Dialog open={!!resetLinkInfo} onOpenChange={open => !open && setResetLinkInfo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Password Reset Link</DialogTitle>
              <DialogDescription>
                Send this link to <span className="font-mono text-foreground">{resetLinkInfo?.email}</span>.
                It is single-use and expires after 1 hour.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
              <span className="flex-1 break-all font-mono text-foreground">{resetLinkInfo?.link}</span>
              {resetLinkInfo && <CopyButton text={resetLinkInfo.link} />}
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>This link is shown once. Copy it before closing.</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetLinkInfo(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Enter as Admin confirmation dialog ─────────────────────────── */}
        <Dialog open={!!enterConfirmCompany} onOpenChange={open => !open && !enteringCompanyId && setEnterConfirmCompany(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter {enterConfirmCompany?.name} Workspace?</DialogTitle>
              <DialogDescription>
                This generates a one-time magic login link for the SUPERADMIN of{' '}
                <span className="font-semibold text-foreground">{enterConfirmCompany?.name}</span>.
                The link expires after 1 hour.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEnterConfirmCompany(null)}
                disabled={!!enteringCompanyId}
              >
                Cancel
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                disabled={!!enteringCompanyId}
                onClick={() => enterConfirmCompany && handleEnterAsAdmin(enterConfirmCompany)}
              >
                {enteringCompanyId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {enteringCompanyId ? 'Generating link…' : 'Generate Login Link →'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Magic link result dialog ────────────────────────────────────── */}
        <Dialog open={!!magicLinkInfo} onOpenChange={open => !open && setMagicLinkInfo(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-indigo-400" />
                Login Link — {magicLinkInfo?.companyName}
              </DialogTitle>
              <DialogDescription>
                One-time magic link for{' '}
                <span className="font-mono text-foreground">{magicLinkInfo?.email}</span>.
                Copy it and open in a new tab, or click Open below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs">
                <span className="flex-1 break-all font-mono text-foreground leading-relaxed">
                  {magicLinkInfo?.link}
                </span>
                {magicLinkInfo && <CopyButton text={magicLinkInfo.link} />}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Single-use, expires in 1 hour. After clicking, you will land on the{' '}
                  <span className="font-mono">{magicLinkInfo?.slug}.optimustesting.com</span> workspace.
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setMagicLinkInfo(null)}>
                Close
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                onClick={() => {
                  if (magicLinkInfo) window.open(magicLinkInfo.link, '_blank');
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in New Tab
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
