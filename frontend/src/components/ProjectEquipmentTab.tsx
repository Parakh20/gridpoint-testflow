import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type EquipmentInstance = Tables<'equipment_instances'>;
type Engineer = Pick<Tables<'profiles'>, 'id' | 'name' | 'email'>;

interface ProjectEquipmentTabProps {
  projectId: string;
  projectStatus: string;
}

export function ProjectEquipmentTab({ projectId, projectStatus: _projectStatus }: ProjectEquipmentTabProps) {
  const [equipment, setEquipment] = useState<EquipmentInstance[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const canAssign = userRole === 'SUPERVISOR' || userRole === 'GM' || userRole === 'SUPERADMIN';

  const fetchEquipment = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_instances')
        .select('*')
        .eq('project_id', projectId)
        .order('equipment_type')
        .order('seq_number');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchEngineers = useCallback(async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'ENGINEER');

    if (!roles?.length) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', roles.map(r => r.user_id))
      .eq('is_active', true)
      .order('name');

    setEngineers(profiles || []);
  }, []);

  useEffect(() => {
    void fetchEquipment();
    void fetchEngineers();
  }, [fetchEquipment, fetchEngineers]);

  const handleAssignEngineer = async (equipmentId: string, engineerId: string | null) => {
    setAssigning(equipmentId);
    try {
      const newStatus = engineerId ? 'ASSIGNED' : 'UNASSIGNED';
      const { error } = await supabase
        .from('equipment_instances')
        .update({ assigned_to: engineerId, status: newStatus })
        .eq('id', equipmentId);

      if (error) throw error;

      setEquipment(prev => prev.map(e =>
        e.id === equipmentId ? { ...e, assigned_to: engineerId, status: newStatus } : e
      ));

      toast({ title: engineerId ? 'Engineer assigned' : 'Engineer unassigned' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Something went wrong';
      toast({ title: 'Assignment failed', description: msg, variant: 'destructive' });
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (equipment.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Equipment Instances</CardTitle></CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No equipment instances found for this project</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Instances ({equipment.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {equipment.map(item => (
            <EquipmentCard
              key={item.id}
              label={item.label}
              equipmentType={item.equipment_type}
              status={item.status}
              footer={
                canAssign ? (
                  assigning === item.id ? (
                    <div className="flex justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Select
                      value={item.assigned_to || 'unassigned'}
                      onValueChange={val => handleAssignEngineer(item.id, val === 'unassigned' ? null : val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Assign engineer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {engineers.map(eng => (
                          <SelectItem key={eng.id} value={eng.id}>
                            {eng.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                ) : undefined
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
