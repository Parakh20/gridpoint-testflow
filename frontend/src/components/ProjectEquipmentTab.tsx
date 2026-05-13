import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

// 10 perceptually-distinct colors that work on both light and dark backgrounds
const ENGINEER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f97316', // orange
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ec4899', // pink
  '#84cc16', // lime
  '#14b8a6', // teal
];

const UNASSIGNED_COLOR = '#4b5563';

interface StackedBarProps {
  tasks: TestTaskRow[];
  colorMap: Map<string, string>;
  engineers: Engineer[];
}

function StackedBar({ tasks, colorMap, engineers }: StackedBarProps) {
  if (tasks.length === 0) return null;

  const assignedCount = tasks.filter(t => t.assigned_to).length;
  const unassignedCount = tasks.length - assignedCount;

  const segments: Array<{ color: string; pct: number }> = [];

  if (unassignedCount > 0) {
    segments.push({ color: UNASSIGNED_COLOR, pct: (unassignedCount / tasks.length) * 100 });
  }

  // Iterate in stable name-sorted order so segment order is predictable
  engineers.forEach(eng => {
    const count = tasks.filter(t => t.assigned_to === eng.id).length;
    if (count > 0) {
      segments.push({ color: colorMap.get(eng.id) ?? UNASSIGNED_COLOR, pct: (count / tasks.length) * 100 });
    }
  });

  return (
    <div className="flex items-center gap-2 mr-3 shrink-0">
      <span className="text-xs text-muted-foreground tabular-nums">
        {assignedCount}/{tasks.length}
      </span>
      <div className="flex h-1.5 w-20 rounded-full overflow-hidden gap-px bg-muted/30">
        {segments.map((seg, i) => (
          <div key={i} style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
        ))}
      </div>
    </div>
  );
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

  // Color map keyed by engineer id. Sorted by id for stable color assignment across renders.
  const engineerColors = useMemo(() => {
    const sorted = [...engineers].sort((a, b) => a.id.localeCompare(b.id));
    const map = new Map<string, string>();
    sorted.forEach((eng, i) => {
      map.set(eng.id, ENGINEER_COLORS[i % ENGINEER_COLORS.length]);
    });
    return map;
  }, [engineers]);

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

            return (
              <AccordionItem key={item.id} value={item.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono font-semibold text-sm">{item.label}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {item.equipment_type.replace(/_/g, ' ')}
                    </span>
                    <div className="ml-auto">
                      <StackedBar tasks={itemTasks} colorMap={engineerColors} engineers={engineers} />
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pb-4">
                  {itemTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No tests configured for this equipment</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {itemTasks.map(task => {
                        const accentColor = task.assigned_to
                          ? (engineerColors.get(task.assigned_to) ?? UNASSIGNED_COLOR)
                          : UNASSIGNED_COLOR;
                        const assignedEngineer = task.assigned_to
                          ? engineers.find(e => e.id === task.assigned_to)
                          : null;

                        return (
                          <div
                            key={task.id}
                            className="rounded-md border bg-card flex flex-col overflow-hidden transition-colors"
                            style={{ borderLeftColor: accentColor, borderLeftWidth: '3px' }}
                          >
                            <div className="px-3 pt-2.5 pb-1 flex-1">
                              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase block mb-1">
                                {task.test_templates?.test_code}
                              </span>
                              <p className="text-sm font-medium leading-snug line-clamp-2">
                                {task.test_templates?.test_name}
                              </p>
                            </div>

                            <div className="px-3 pb-2.5 pt-1.5">
                              {canAssign ? (
                                assigning === task.id ? (
                                  <div className="flex justify-center py-1">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                  </div>
                                ) : (
                                  <Select
                                    value={task.assigned_to ?? 'unassigned'}
                                    onValueChange={val =>
                                      handleAssignTest(task.id, val === 'unassigned' ? null : val)
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-xs w-full">
                                      {assignedEngineer ? (
                                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                          <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: accentColor }}
                                          />
                                          <span className="truncate">{assignedEngineer.name}</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">Unassigned</span>
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                                          <span>Unassigned</span>
                                        </div>
                                      </SelectItem>
                                      {engineers.map(eng => (
                                        <SelectItem key={eng.id} value={eng.id}>
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-2 h-2 rounded-full shrink-0"
                                              style={{ backgroundColor: engineerColors.get(eng.id) }}
                                            />
                                            <span>{eng.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )
                              ) : (
                                <span
                                  className="text-xs"
                                  style={{ color: assignedEngineer ? accentColor : undefined }}
                                >
                                  {assignedEngineer?.name ?? (
                                    <span className="text-muted-foreground">Unassigned</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
