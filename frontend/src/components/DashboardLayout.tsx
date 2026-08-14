import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, getAvatarColor } from '@/lib/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { RealtimeStatusBanner } from '@/components/RealtimeStatusBanner';
import { TrialBanner } from '@/components/TrialBanner';
import { dashboardPath } from '@/lib/routes';
import {
  Zap,
  LogOut,
  FolderOpen,
  Plus,
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCircle,
  BarChart2,
  CreditCard,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

function getNavItems(role: string | null): NavGroup[] {
  switch (role) {
    case 'SUPERADMIN':
      return [
        {
          heading: 'PLATFORM',
          items: [
            { label: 'Dashboard', href: '/superadmin', icon: <LayoutDashboard size={18} /> },
            { label: 'User Management', href: '/superadmin', icon: <Users size={18} /> },
            { label: 'Projects', href: '/gm', icon: <FolderOpen size={18} /> },
          ],
        },
        {
          heading: 'REPORTING',
          items: [{ label: 'Reports', href: '/reports', icon: <BarChart2 size={18} /> }],
        },
        {
          heading: 'WORKSPACE',
          items: [
            { label: 'Billing', href: '/settings/billing', icon: <CreditCard size={18} /> },
            { label: 'Profile', href: '/profile', icon: <UserCircle size={18} /> },
          ],
        },
      ];
    case 'GM':
      return [
        {
          heading: 'WORKSPACE',
          items: [
            { label: 'Projects', href: '/gm', icon: <FolderOpen size={18} /> },
            { label: 'New Project', href: '/projects/new', icon: <Plus size={18} /> },
          ],
        },
        {
          heading: 'REPORTING',
          items: [{ label: 'Reports', href: '/reports', icon: <BarChart2 size={18} /> }],
        },
        {
          heading: 'ACCOUNT',
          items: [{ label: 'Profile', href: '/profile', icon: <UserCircle size={18} /> }],
        },
      ];
    case 'SUPERVISOR':
      return [
        {
          heading: 'WORKSPACE',
          items: [{ label: 'Dashboard', href: '/supervisor', icon: <LayoutDashboard size={18} /> }],
        },
        {
          heading: 'REPORTING',
          items: [{ label: 'Reports', href: '/reports', icon: <BarChart2 size={18} /> }],
        },
        {
          heading: 'ACCOUNT',
          items: [{ label: 'Profile', href: '/profile', icon: <UserCircle size={18} /> }],
        },
      ];
    case 'ENGINEER':
      return [
        {
          heading: 'MY WORK',
          items: [{ label: 'My Tasks', href: '/engineer', icon: <ClipboardList size={18} /> }],
        },
        {
          heading: 'ACCOUNT',
          items: [{ label: 'Profile', href: '/profile', icon: <UserCircle size={18} /> }],
        },
      ];
    default:
      return [];
  }
}

const SIDEBAR_COLLAPSED_KEY = 'tf.sidebar.collapsed';

function RolePill({ role }: { role: string | null }) {
  const colors: Record<string, string> = {
    SUPERADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    GM:         'bg-blue-500/20 text-blue-300 border-blue-500/30',
    SUPERVISOR: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    ENGINEER:   'bg-green-500/20 text-green-300 border-green-500/30',
  };
  if (!role) return null;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded border ${colors[role] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {role === 'SUPERVISOR' ? 'manager' : role.toLowerCase()}
    </span>
  );
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { signOut, user, userRole, userName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navGroups = getNavItems(userRole);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');

  function toggleCollapsed() {
    setCollapsed(current => {
      const next = !current;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="tf-bg-grid" />

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card/95 backdrop-blur-sm ${collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-glow-blue">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">TestFlow</p>
              <p className="font-mono text-[9px] text-muted-foreground leading-tight uppercase tracking-widest">Grid Control</p>
            </div>
          )}
        </div>

        {/* Workspace label */}
        {userRole && !collapsed && (
          <div className="px-5 pt-4 pb-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60">Workspace</p>
            <p className="text-xs font-semibold text-foreground mt-0.5">{userRole === 'SUPERVISOR' ? 'Manager' : userRole.charAt(0) + userRole.slice(1).toLowerCase()} Portal</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map(group => (
            <div key={group.heading}>
              {!collapsed && (
                <p className="px-3 pb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  {group.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active =
                    location.pathname === item.href ||
                    (item.href.length > 1 && location.pathname.startsWith(item.href + '/'));
                  return (
                    <button
                      key={item.href + item.label}
                      onClick={() => navigate(item.href)}
                      title={collapsed ? item.label : undefined}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary/15 text-primary border border-primary/20'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className={active ? 'text-primary' : 'text-muted-foreground'}>{item.icon}</span>
                      {!collapsed && item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
          {!collapsed && 'Collapse'}
        </button>

        {/* Bottom — user info + controls */}
        <div className="border-t border-border px-3 py-4 space-y-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(user?.id)}`}
            >
              {getInitials(userName, user?.email)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{userName || user?.email}</p>
              <RolePill role={userRole} />
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
            </div>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className={`flex flex-col flex-1 ${collapsed ? 'ml-sidebar-collapsed' : 'ml-sidebar'} min-w-0 relative z-10`}>
        {/* Frosted top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-card/80 backdrop-blur-sm px-6">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        </header>

        <TrialBanner />
        <RealtimeStatusBanner />

        <main className="flex-1 px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
