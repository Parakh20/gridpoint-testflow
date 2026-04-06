import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface EquipmentInstance {
  id: string;
  label: string;
  equipment_type: string;
  status: string;
  seq_number: number;
  assigned_to: string | null;
}

interface Engineer {
  id: string;
  name: string;
  email: string;
}

interface ProjectEquipmentTabProps {
  projectId: string;
  projectStatus: string;
}

export function ProjectEquipmentTab({ projectId, projectStatus }: ProjectEquipmentTabProps) {
  const [equipment, setEquipment] = useState<EquipmentInstance[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const canAssign = userRole === 'SUPERVISOR' || userRole === 'GM' || userRole === 'SUPERADMIN';

  useEffect(() => {
    fetchEquipment();
    fetchEngineers();
  }, [projectId]);

  const fetchEquipment = async () => {
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
  };

  const fetchEngineers = async () => {
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
  };

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
    } catch (error: any) {
      toast({ title: 'Assignment failed', description: error.message, variant: 'destructive' });
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
        <CardHeader>
          <CardTitle>Equipment Instances</CardTitle>
        </CardHeader>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Equipment Type</TableHead>
              <TableHead>Status</TableHead>
              {canAssign && <TableHead>Assigned Engineer</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.label}</TableCell>
                <TableCell>{item.equipment_type.replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                {canAssign && (
                  <TableCell>
                    {assigning === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Select
                        value={item.assigned_to || 'unassigned'}
                        onValueChange={(val) => handleAssignEngineer(item.id, val === 'unassigned' ? null : val)}
                      >
                        <SelectTrigger className="w-48">
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
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
