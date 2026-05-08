import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && userRole) {
      // Redirect to appropriate dashboard based on role
      switch (userRole) {
        case 'SUPERADMIN':
          navigate('/superadmin');
          break;
        case 'GM':
          navigate('/gm');
          break;
        case 'SUPERVISOR':
          navigate('/supervisor');
          break;
        case 'ENGINEER':
          navigate('/engineer');
          break;
        default:
          // If no role assigned yet, show message
          break;
      }
    }
  }, [userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="mb-4 text-4xl font-bold">Welcome to TestFlow</h1>
        <p className="text-xl text-muted-foreground mb-4">
          Your role is being configured by the administrator
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Please contact your system administrator to assign you a role
        </p>
        <Button onClick={signOut} variant="outline" className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Index;
