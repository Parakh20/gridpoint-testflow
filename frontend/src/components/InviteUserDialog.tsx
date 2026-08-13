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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { UpgradeModal } from '@/components/UpgradeModal';
import type { UpgradeReason } from '@testflow/shared';

const inviteUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  role: z.enum(['SUPERADMIN', 'GM', 'SUPERVISOR', 'ENGINEER']),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/\d/, 'Password must include a number'),
});

type InviteUserForm = z.infer<typeof inviteUserSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteUserDialog({ open, onOpenChange, onSuccess }: InviteUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);

  const form = useForm<InviteUserForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { name: '', email: '', role: 'ENGINEER', password: '' },
  });

  const generatePassword = () => {
    // Guarantee complexity rules by seeding one of each required class.
    const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower  = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '@#$%';
    const pool = upper + lower + digits + symbols;
    const pick = (src: string) => {
      const b = new Uint8Array(1); crypto.getRandomValues(b); return src[b[0] % src.length];
    };
    const required = [pick(upper), pick(lower), pick(digits)];
    const rest = Array.from({ length: 9 }, () => pick(pool));
    const all = [...required, ...rest];
    // Fisher-Yates shuffle so required chars aren't always at the start
    for (let i = all.length - 1; i > 0; i--) {
      const b = new Uint8Array(1); crypto.getRandomValues(b);
      const j = b[0] % (i + 1);
      [all[i], all[j]] = [all[j], all[i]];
    }
    form.setValue('password', all.join(''));
    setShowPassword(true);
  };

  const onSubmit = async (data: InviteUserForm) => {
    setIsLoading(true);
    try {
      // Use the server-side Edge Function — it uses the Admin API with the
      // service role key so public signUp is never called from the browser.
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: { name: data.name, email: data.email, password: data.password, role: data.role },
      });

      if (error) throw error;
      if (result?.code === 'PLAN_LIMIT_REACHED') {
        setUpgradeReason({
          code: 'PLAN_LIMIT_REACHED',
          resource: result.resource,
          current: result.current ?? null,
          limit: result.limit ?? null,
          required_plan: result.required_plan ?? null,
        });
        setIsLoading(false);
        return;
      }
      if (result?.error) throw new Error(result.error);

      toast.success('User created successfully', {
        description: `${data.name} has been added with ${data.role} role`,
      });

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again';
      console.error('Error creating user:', err);
      toast.error('Failed to create user', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a user account and assign their role. Share the credentials with them directly.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="john@company.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ENGINEER">Engineer</SelectItem>
                      <SelectItem value="SUPERVISOR">Manager</SelectItem>
                      <SelectItem value="GM">GM</SelectItem>
                      <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password</FormLabel>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FormControl>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Generate or enter password"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button type="button" variant="outline" onClick={generatePassword}>
                      Generate
                    </Button>
                  </div>
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
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <UpgradeModal reason={upgradeReason} onOpenChange={(open) => !open && setUpgradeReason(null)} />
    </>
  );
}
