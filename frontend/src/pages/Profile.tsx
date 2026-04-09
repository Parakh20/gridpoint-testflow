import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user, updatePassword } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.name) setName(data.name);
      });
  }, [user]);

  const handleSaveName = async () => {
    if (!user || !name.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Name updated', description: 'Your display name has been saved.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to update name.', variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters.', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      toast({ title: 'Password updated', description: 'Your password has been changed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message ?? 'Failed to update password.', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-lg space-y-6">
        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
              />
            </div>
            <Button onClick={handleSaveName} disabled={savingName || !name.trim()}>
              {savingName ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Name
            </Button>
          </CardContent>
        </Card>

        {/* Password change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
