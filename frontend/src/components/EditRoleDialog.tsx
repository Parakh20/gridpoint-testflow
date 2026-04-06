import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const editRoleSchema = z.object({
  role: z.enum(['SUPERADMIN', 'GM', 'SUPERVISOR', 'ENGINEER']),
});

type EditRoleForm = z.infer<typeof editRoleSchema>;

interface UserData {
  id: string;
  name: string;
  email: string;
  currentRole: string;
  roleId: string;
}

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user: UserData | null;
}

export function EditRoleDialog({ open, onOpenChange, onSuccess, user }: EditRoleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const form = useForm<EditRoleForm>({
    resolver: zodResolver(editRoleSchema),
    values: {
      role: (user?.currentRole as any) || 'ENGINEER',
    },
  });

  const handleSubmit = async (data: EditRoleForm) => {
    if (!user) return;

    // Check if changing to/from SUPERADMIN
    if (data.role === 'SUPERADMIN' || user.currentRole === 'SUPERADMIN') {
      setPendingRole(data.role);
      setShowConfirm(true);
      return;
    }

    await updateRole(data.role);
  };

  const updateRole = async (newRole: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Delete old role (only if one exists)
      if (user.roleId) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('id', user.roleId);

        if (deleteError) throw deleteError;
      }

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: newRole as 'SUPERADMIN' | 'GM' | 'SUPERVISOR' | 'ENGINEER',
        });

      if (insertError) throw insertError;

      // Log the action
      await supabase.from('audit_logs').insert({
        entity_type: 'user_role',
        entity_id: user.id,
        action: 'UPDATE',
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        before_data: { role: user.currentRole },
        after_data: { role: newRole },
      });

      toast.success('Role updated successfully', {
        description: `${user.name}'s role changed to ${newRole}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
      setPendingRole(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {user?.name} ({user?.email})
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ENGINEER">Engineer</SelectItem>
                        <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                        <SelectItem value="GM">GM</SelectItem>
                        <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Role
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              You are changing a SUPERADMIN role. This is a sensitive operation. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingRole && updateRole(pendingRole)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
