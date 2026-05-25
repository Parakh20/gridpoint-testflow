import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PlatformLogin, PlatformDashboard } from "./pages/PlatformAdmin";
import Marketing from "./pages/Marketing";
import BlogIndex from "@/pages/blog/BlogIndex";
import BlogPost from "@/pages/blog/BlogPost";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import SuperadminDashboard from "./pages/dashboards/SuperadminDashboard";
import GMDashboard from "./pages/dashboards/GMDashboard";
import SupervisorDashboard from "./pages/dashboards/SupervisorDashboard";
import EngineerDashboard from "./pages/dashboards/EngineerDashboard";
import EngineerProjectDetail from "./pages/engineer/EngineerProjectDetail";
import NewProject from "@/pages/projects/NewProject";
import ProjectDetail from "@/pages/projects/ProjectDetail";
import EditProject from "@/pages/projects/EditProject";
import Profile from "@/pages/Profile";
import ReportsList from "@/pages/reports/ReportsList";
import ReportProjectDetail from "@/pages/reports/ReportProjectDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Three host modes:
//   - `admin.optimustesting.com`             → platform admin (PlatformLogin + PlatformDashboard)
//   - `optimustesting.com` / www / localhost → public marketing site
//   - anything-else.optimustesting.com       → tenant workspace (CompanyProvider + AuthProvider)
// `?marketing` query string forces the marketing site on any host (useful for previewing locally).
const HOST = window.location.hostname;
const FORCE_MARKETING = new URLSearchParams(window.location.search).has('marketing');
const FORCE_ADMIN = new URLSearchParams(window.location.search).has('admin');

const IS_ADMIN_HOST = FORCE_ADMIN || HOST === 'admin.optimustesting.com';
const IS_MARKETING_HOST =
  !IS_ADMIN_HOST &&
  (FORCE_MARKETING ||
    HOST === 'optimustesting.com' ||
    HOST === 'www.optimustesting.com' ||
    HOST === 'localhost' ||
    HOST === '127.0.0.1');

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {IS_ADMIN_HOST ? (
              // Platform admin — no CompanyProvider / AuthProvider needed
              <Routes>
                <Route path="/" element={<PlatformLogin />} />
                <Route path="/admin" element={<PlatformDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            ) : IS_MARKETING_HOST ? (
              // Public-facing marketing site at optimustesting.com (apex)
              <Routes>
                <Route path="/" element={<Marketing />} />
                <Route path="/blog" element={<BlogIndex />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            ) : (
              <CompanyProvider>
              <AuthProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/superadmin" element={<ProtectedRoute requiredRole="SUPERADMIN"><SuperadminDashboard /></ProtectedRoute>} />
                <Route path="/gm" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN']}><GMDashboard /></ProtectedRoute>} />
                <Route path="/projects/new" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN']}><NewProject /></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                <Route path="/projects/:id/edit" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN']}><EditProject /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/supervisor" element={<ProtectedRoute requiredRole="SUPERVISOR"><SupervisorDashboard /></ProtectedRoute>} />
                <Route path="/engineer" element={<ProtectedRoute requiredRole="ENGINEER"><EngineerDashboard /></ProtectedRoute>} />
                <Route path="/engineer/projects/:id" element={<ProtectedRoute requiredRole="ENGINEER"><EngineerProjectDetail /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN', 'SUPERVISOR']}><ReportsList /></ProtectedRoute>} />
                <Route path="/reports/:id" element={<ProtectedRoute requiredRole={['GM', 'SUPERADMIN', 'SUPERVISOR']}><ReportProjectDetail /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </AuthProvider>
              </CompanyProvider>
            )}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
