import { Zap, AlertTriangle } from 'lucide-react';

interface CompanyNotFoundProps {
  slug: string;
}

export default function CompanyNotFound({ slug }: CompanyNotFoundProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="tf-bg-grid" />
      <div className="relative z-10 w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Company not found</h1>
          <p className="text-muted-foreground">
            No organisation is registered under{' '}
            <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{slug}</code>.
          </p>
          <p className="text-sm text-muted-foreground">
            Check the URL or contact your administrator for the correct link.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>TestFlow · Grid Control</span>
        </div>
      </div>
    </div>
  );
}
