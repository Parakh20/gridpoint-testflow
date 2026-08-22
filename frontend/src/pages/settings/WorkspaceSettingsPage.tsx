import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';

export default function WorkspaceSettingsPage() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [slug, setSlug] = useState(company?.slug ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_company_slug', { _new_slug: slug });
      if (error) throw error;
      const result = data as { slug: string; workspace_url: string };
      toast({ title: 'Workspace name updated', description: `Your workspace identifier is now ${result.slug}.` });
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update workspace name';
      toast({
        title: 'Update failed',
        description: message === 'slug_taken' ? 'That workspace name is already taken.' : message,
        variant: 'destructive',
      });
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <DashboardLayout title="Workspace">
      <div className="space-y-6 p-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
          <p className="text-muted-foreground">Your workspace's identifier.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workspace name</CardTitle>
            <CardDescription>
              A short identifier for your workspace, used in exports and support requests.
              Currently <span className="font-mono">{company?.slug}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="workspace-slug">New workspace name</Label>
              <div className="flex items-center rounded-md border px-3">
                <Input
                  id="workspace-slug"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase())}
                  disabled={saving}
                  className="border-0 px-0 focus-visible:ring-0"
                />
              </div>
            </div>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={saving || !slug || slug === company?.slug}
            >
              Save changes
            </Button>
          </CardContent>
        </Card>

        <AlertDialog open={confirmOpen} onOpenChange={o => { if (!saving) setConfirmOpen(o); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change workspace name?</AlertDialogTitle>
              <AlertDialogDescription>
                Your workspace identifier will change to <span className="font-mono">{slug}</span>.
                Anything that referenced the old identifier (saved exports, support tickets) will no longer match.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Confirm change'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
