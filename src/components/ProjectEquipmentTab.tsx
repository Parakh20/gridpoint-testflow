import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EquipmentInstance {
  id: string;
  label: string;
  equipment_type: string;
  status: string;
  seq_number: number;
}

interface ProjectEquipmentTabProps {
  projectId: string;
  projectStatus: string;
}

export function ProjectEquipmentTab({ projectId, projectStatus }: ProjectEquipmentTabProps) {
  const [equipment, setEquipment] = useState<EquipmentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEquipment();
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
