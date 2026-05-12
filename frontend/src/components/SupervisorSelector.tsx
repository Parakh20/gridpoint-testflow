import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface Supervisor {
  id: string;
  name: string;
  email: string;
}

interface SupervisorSelectorProps {
  value?: string;
  onChange: (supervisorId: string | null) => void;
  label?: string;
  required?: boolean;
}

export function SupervisorSelector({ value, onChange, label = "Assigned Manager", required = false }: SupervisorSelectorProps) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      // Fetch users with SUPERVISOR role
      const { data: supervisorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'SUPERVISOR');

      if (rolesError) throw rolesError;

      if (supervisorRoles && supervisorRoles.length > 0) {
        const supervisorIds = supervisorRoles.map(r => r.user_id);

        // Fetch profiles for these supervisors
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', supervisorIds)
          .eq('is_active', true)
          .order('name');

        if (profilesError) throw profilesError;

        setSupervisors(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center justify-center p-2 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select value={value || 'unassigned'} onValueChange={(val) => onChange(val === 'unassigned' ? null : val)}>
        <SelectTrigger>
          <SelectValue placeholder="Select a manager" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {supervisors.map((supervisor) => (
            <SelectItem key={supervisor.id} value={supervisor.id}>
              {supervisor.name} ({supervisor.email})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {supervisors.length === 0 && (
        <p className="text-xs text-muted-foreground">No active managers available</p>
      )}
    </div>
  );
}
