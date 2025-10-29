import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2, Zap } from 'lucide-react';
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
  const [generating, setGenerating] = useState(false);
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

  const generateEquipment = async () => {
    setGenerating(true);
    try {
      // Fetch scope items
      const { data: scopeItems, error: scopeError } = await supabase
        .from('scope_items')
        .select('*')
        .eq('project_id', projectId);

      if (scopeError) throw scopeError;

      if (!scopeItems || scopeItems.length === 0) {
        toast({
          title: 'No Scope Defined',
          description: 'Please define equipment scope first',
          variant: 'destructive',
        });
        return;
      }

      // Fetch testing scope configuration
      const { data: testingScope, error: testingScopeError } = await supabase
        .from('project_test_scope')
        .select('*, test_templates(*)')
        .eq('project_id', projectId)
        .eq('is_enabled', true);

      if (testingScopeError) throw testingScopeError;

      if (!testingScope || testingScope.length === 0) {
        toast({
          title: 'No Testing Scope Defined',
          description: 'Please define testing scope before generating equipment',
          variant: 'destructive',
        });
        return;
      }

      // Generate equipment instances
      const instances: any[] = [];
      for (const scopeItem of scopeItems) {
        const typePrefix = scopeItem.equipment_type.substring(0, 3).toUpperCase();
        
        for (let i = 1; i <= scopeItem.quantity; i++) {
          instances.push({
            project_id: projectId,
            scope_item_id: scopeItem.id,
            equipment_type: scopeItem.equipment_type,
            seq_number: i,
            label: `${typePrefix}-${String(i).padStart(3, '0')}`,
            status: 'UNASSIGNED',
          });
        }
      }

      const { data: createdInstances, error: instanceError } = await supabase
        .from('equipment_instances')
        .insert(instances)
        .select();

      if (instanceError) throw instanceError;

      // Create test tasks using testing scope configuration
      const testTasks: any[] = [];
      for (const instance of createdInstances || []) {
        // Get enabled test templates for this equipment type from testing scope
        const relevantTemplates = testingScope
          ?.filter(scope => scope.equipment_type === instance.equipment_type)
          .map(scope => scope.test_templates)
          .filter(Boolean) || [];

        for (const template of relevantTemplates) {
          testTasks.push({
            equipment_instance_id: instance.id,
            test_template_id: template.id,
            status: 'DRAFT',
          });
        }
      }

      if (testTasks.length > 0) {
        const { error: taskError } = await supabase
          .from('test_tasks')
          .insert(testTasks);

        if (taskError) throw taskError;
      }

      toast({
        title: 'Success',
        description: `Generated ${instances.length} equipment instances and ${testTasks.length} test tasks`,
      });

      fetchEquipment();
    } catch (error) {
      console.error('Error generating equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate equipment instances',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
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
        <CardContent className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">No equipment instances generated yet</p>
          {(projectStatus === 'APPROVED' || projectStatus === 'ACTIVE') && (
            <Button onClick={generateEquipment} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Equipment & Test Tasks
                </>
              )}
            </Button>
          )}
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
