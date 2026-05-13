import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type EquipmentInstance = Tables<'equipment_instances'>;
type Engineer = Pick<Tables<'profiles'>, 'id' | 'name' | 'email'>;

interface TestTaskRow {
  id: string;
  equipment_instance_id: string;
  assigned_to: string | null;
  status: string;
  test_template_id: string;
  test_templates: { test_name: string; test_code: string; tab: string } | null;
}

interface ProjectEquipmentTabProps {
  projectId: string;
  projectStatus: string;
}

export function ProjectEquipmentTab({ projectId, projectStatus: _projectStatus }: ProjectEquipmentTabProps) {
  const [equipment, setEquipment] = useState<EquipmentInstance[]>([]);
  const [tasks, setTasks] = useState<TestTaskRow[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const { toast } = useToast();
  const { userRole } = useAuth();

  const canAssign = userRole === 'SUPERVISOR' || userRole === 'GM' || userRole === 'SUPERADMIN';

  const fetchData = useCallback(async () => {
    try {
      const { data: equipData, error: equipError } = await supabase
        .from('equipment_instances')
        .select('*')
        .eq('project_id', projectId)
        .order('equipment_type')
        .order('seq_number');

      if (equipError) throw equipError;
      const equipList = equipData || [];
      setEquipment(equipList);

      if (equipList.length > 0) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('test_tasks')
          .select('id, equipment_instance_id, assigned_to, status, test_template_id, test_templates(test_name, test_code, tab)')
          .in('equipment_instance_id', equipList.map(e => e.id));

        if (tasksError) throw tasksError;
        setTasks((tasksData || []) as TestTaskRow[]);
      }
    } catch (err) {
      console.error('Error fetching equipment:', err);
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
    void fetchData();
    void fetchEngineers();
  }, [fetchData, fetchEngineers]);

  const handleAssignTest = async (taskId: string, engineerId: string | null) => {
    setAssigning(taskId);
    try {
      const { error } = await supabase
        .from('test_tasks')
        .update({ assigned_to: engineerId })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: engineerId } : t));
      toast({ title: engineerId ? 'Engineer assigned' : 'Engineer unassigned' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
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

  const tasksByEquipment = tasks.reduce<Record<string, TestTaskRow[]>>((acc, t) => {
    (acc[t.equipment_instance_id] ??= []).push(t);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Instances ({equipment.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-2">
          {equipment.map(item => {
            const itemTasks = tasksByEquipment[item.id] || [];
            const assignedCount = itemTasks.filter(t => t.assigned_to).length;
            const allAssigned = itemTasks.length > 0 && assignedCount === itemTasks.length;

            return (
              <AccordionItem key={item.id} value={item.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono font-semibold text-sm">{item.label}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {item.equipment_type.replace(/_/g, ' ')}
                    </span>
                    <Badge
                      variant={allAssigned ? 'default' : 'secondary'}
                      className="ml-auto mr-3 text-xs shrink-0"
                    >
                      {assignedCount}/{itemTasks.length} assigned
                    </Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pb-3">
                  {itemTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No tests configured for this equipment</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {itemTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between gap-4 py-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-[11px] text-muted-foreground mr-2 uppercase">
                              {task.test_templates?.test_code}
                            </span>
                            <span className="text-sm">{task.test_templates?.test_name}</span>
                          </div>

                          {canAssign ? (
                            assigning === task.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                            ) : (
                              <Select
                                value={task.assigned_to ?? 'unassigned'}
                                onValueChange={val =>
                                  handleAssignTest(task.id, val === 'unassigned' ? null : val)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs w-[180px] shrink-0">
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
                          ) : (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {engineers.find(e => e.id === task.assigned_to)?.name ?? 'Unassigned'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
