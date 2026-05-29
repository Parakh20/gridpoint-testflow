import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type CompanyUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  is_active: boolean;
  created_at: string;
};

// ── List all users in company ─────────────────────────────────────────────────

async function fetchCompanyUsers(): Promise<CompanyUser[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, email, is_active, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!profiles?.length) return [];

  const ids = profiles.map((p: any) => p.id);
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('user_id', ids);

  const roleMap = Object.fromEntries((roles ?? []).map((r: any) => [r.user_id, r.role]));
  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    is_active: p.is_active,
    created_at: p.created_at,
    role: roleMap[p.id] ?? null,
  }));
}

export function useCompanyUsers() {
  return useQuery({ queryKey: ['company-users'], queryFn: fetchCompanyUsers });
}

// ── Create user (calls Edge Function) ────────────────────────────────────────

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) {
        const err = new Error(data.error) as any;
        err.edgeFnError = data.error;
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-users'] });
    },
  });
}

// ── Update user role ──────────────────────────────────────────────────────────

type UpdateRoleInput = { userId: string; newRole: string; companyId: string };

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, newRole, companyId }: UpdateRoleInput) => {
      // The user_roles RLS policy requires WITH CHECK (company_id = my_company_id()),
      // so the new row MUST carry company_id or the insert is rejected (which would
      // leave the user role-less after the delete below). Insert first under the new
      // (user_id, role) pair, then clear any other roles — that way a failure can
      // never strip the user of a role.
      const { error: insErr } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: userId, role: newRole, company_id: companyId },
          { onConflict: 'user_id,role' }
        );
      if (insErr) throw insErr;

      // user_roles has UNIQUE(user_id, role); a user holds one role here, so drop
      // any stale roles other than the one we just set.
      const { error: delErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .neq('role', newRole);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-users'] });
    },
  });
}

// ── Toggle user active ────────────────────────────────────────────────────────

type ToggleActiveInput = { userId: string; isActive: boolean };

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, isActive }: ToggleActiveInput) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-users'] });
    },
  });
}
