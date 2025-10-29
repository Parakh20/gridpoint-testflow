import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SuperadminDashboard from "./pages/dashboards/SuperadminDashboard";
import GMDashboard from "./pages/dashboards/GMDashboard";
import SupervisorDashboard from "./pages/dashboards/SupervisorDashboard";
import EngineerDashboard from "./pages/dashboards/EngineerDashboard";
import NewProject from "./pages/projects/NewProject";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/superadmin" element={<ProtectedRoute requiredRole="SUPERADMIN"><SuperadminDashboard /></ProtectedRoute>} />
            <Route path="/gm" element={<ProtectedRoute requiredRole="GM"><GMDashboard /></ProtectedRoute>} />
            <Route path="/projects/new" element={<ProtectedRoute requiredRole="GM"><NewProject /></ProtectedRoute>} />
            <Route path="/supervisor" element={<ProtectedRoute requiredRole="SUPERVISOR"><SupervisorDashboard /></ProtectedRoute>} />
            <Route path="/engineer" element={<ProtectedRoute requiredRole="ENGINEER"><EngineerDashboard /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
