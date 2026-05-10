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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SuperadminDashboard from "./pages/dashboards/SuperadminDashboard";
import GMDashboard from "./pages/dashboards/GMDashboard";
import SupervisorDashboard from "./pages/dashboards/SupervisorDashboard";
import EngineerDashboard from "./pages/dashboards/EngineerDashboard";
import EngineerProjectDetail from "./pages/engineer/EngineerProjectDetail";
import NewProject from "@/pages/projects/NewProject";
import ProjectDetail from "@/pages/projects/ProjectDetail";
import EditProject from "@/pages/projects/EditProject";
import Profile from "@/pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Platform admin panel renders at the root domain; all other hostnames are tenant subdomains.
const isRootDomain = ['optimustesting.com', 'www.optimustesting.com', 'localhost', '127.0.0.1'].includes(window.location.hostname);

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {isRootDomain ? (
              // Platform admin — no CompanyProvider / AuthProvider needed
              <Routes>
                <Route path="/" element={<PlatformLogin />} />
                <Route path="/admin" element={<PlatformDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            ) : (
              <CompanyProvider>
              <AuthProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
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
