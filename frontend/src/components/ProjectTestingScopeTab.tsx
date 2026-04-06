import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Database } from '@/integrations/supabase/types';

type EquipmentType = Database['public']['Enums']['equipment_type'];

/** Canonical short labels for equipment instance IDs, e.g. PTR-001 */
const EQUIPMENT_LABEL: Record<EquipmentType, string> = {
  POWER_TRANSFORMER: 'PTR',
  CT:               'CT',
  CVT:              'CVT',
  LA:               'LA',
  SF6_BREAKER:      'SF6',
  ISOLATOR:         'ISO',
  VCB:              'VCB',
  EARTH_PIT:        'EP',
};

interface TestScopeConfig {
  equipmentType: EquipmentType;
  templates: {
    id: string;
    testName: string;
    testCode: string;
    tab: string;
    isEnabled: boolean;
  }[];
}

interface ScopeItem {
  equipment_type: EquipmentType;
  quantity: number;
}

interface ProjectTestingScopeTabProps {
  projectId: string;
  projectStatus: string;
  onEquipmentGenerated?: () => void;
}

export function ProjectTestingScopeTab({ projectId, projectStatus, onEquipmentGenerated }: ProjectTestingScopeTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  const [testConfigs, setTestConfigs] = useState<TestScopeConfig[]>([]);
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const { toast } = useToast();

  const isEditable = projectStatus === 'DRAFT' || projectStatus === 'APPROVED';

  useEffect(() => { fetchData(); }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [scopeResult, existingInstancesResult] = await Promise.all([
        supabase.from('scope_items').select('equipment_type, quantity').eq('project_id', projectId),
        supabase.from('equipment_instances').select('id').eq('project_id', projectId).limit(1),
      ]);

      if (scopeResult.error) throw scopeResult.error;
      const scopeData = scopeResult.data ?? [];
      setScopeItems(scopeData);
      setAlreadyGenerated(!!existingInstancesResult.data?.length);

      const equipmentTypes = scopeData.map(item => item.equipment_type);

      const [templatesResult, scopeConfigResult] = await Promise.all([
        supabase.from('test_templates').select('*').in('equipment_type', equipmentTypes).eq('is_active', true),
        supabase.from('project_test_scope').select('*').eq('project_id', projectId),
      ]);

      if (templatesResult.error) throw templatesResult.error;
      if (scopeConfigResult.error) throw scopeConfigResult.error;

      const configsByType: Record<string, TestScopeConfig> = {};
      equipmentTypes.forEach(equipType => {
        const templates = (templatesResult.data ?? [])
          .filter(t => t.equipment_type === equipType)
          .map(template => {
            const existing = scopeConfigResult.data?.find(s => s.test_template_id === template.id);
            return {
              id: template.id,
              testName: template.test_name,
              testCode: template.test_code,
              tab: template.tab,
              isEnabled: existing ? existing.is_enabled : true,
            };
          });
        configsByType[equipType] = { equipmentType: equipType, templates };
      });

      setTestConfigs(Object.values(configsByType));
    } catch (error) {
      console.error('Error fetching testing scope:', error);
      toast({ title: 'Error', description: 'Failed to load testing scope', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTest = (equipmentType: string, testId: string) => {
    setTestConfigs(prev =>
      prev.map(config =>
        config.equipmentType === equipmentType
          ? { ...config, templates: config.templates.map(t => t.id === testId ? { ...t, isEnabled: !t.isEnabled } : t) }
          : config
      )
    );
  };

  const handleToggleAll = (equipmentType: string, enabled: boolean) => {
    setTestConfigs(prev =>
      prev.map(config =>
        config.equipmentType === equipmentType
          ? { ...config, templates: config.templates.map(t => ({ ...t, isEnabled: enabled })) }
          : config
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await supabase.from('project_test_scope').delete().eq('project_id', projectId);

      const scopeRecords = testConfigs.flatMap(config =>
        config.templates.map(template => ({
          project_id: projectId,
          equipment_type: config.equipmentType as EquipmentType,
          test_template_id: template.id,
          is_enabled: template.isEnabled,
        }))
      );

      if (scopeRecords.length > 0) {
        const { error } = await supabase.from('project_test_scope').insert(scopeRecords);
        if (error) throw error;
      }

      toast({ title: 'Success', description: 'Testing scope saved successfully' });
    } catch (error) {
      console.error('Error saving testing scope:', error);
      toast({ title: 'Error', description: 'Failed to save testing scope', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalTests = () =>
    testConfigs.reduce((total, config) => {
      const qty = scopeItems.find(s => s.equipment_type === config.equipmentType)?.quantity ?? 0;
      return total + qty * config.templates.filter(t => t.isEnabled).length;
    }, 0);

  const generateEquipment = async () => {
    if (alreadyGenerated) {
      toast({
        title: 'Already generated',
        description: 'Equipment instances have already been generated for this project.',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      if (!scopeItems.length) {
        toast({ title: 'No Scope Defined', description: 'Please define equipment scope first', variant: 'destructive' });
        return;
      }

      const hasEnabledTests = testConfigs.some(c => c.templates.some(t => t.isEnabled));
      if (!hasEnabledTests) {
        toast({ title: 'No Tests Selected', description: 'Please select at least one test before generating equipment', variant: 'destructive' });
        return;
      }

      const { data: fetchedScopeItems, error: fetchScopeError } = await supabase
        .from('scope_items')
        .select('*')
        .eq('project_id', projectId);
      if (fetchScopeError) throw fetchScopeError;

      const instances = (fetchedScopeItems ?? []).flatMap(scopeItem => {
        const prefix = EQUIPMENT_LABEL[scopeItem.equipment_type as EquipmentType] ?? scopeItem.equipment_type.substring(0, 3).toUpperCase();
        return Array.from({ length: scopeItem.quantity }, (_, i) => ({
          project_id: projectId,
          scope_item_id: scopeItem.id,
          equipment_type: scopeItem.equipment_type,
          seq_number: i + 1,
          label: `${prefix}-${String(i + 1).padStart(3, '0')}`,
          status: 'UNASSIGNED' as const,
        }));
      });

      const { data: createdInstances, error: instanceError } = await supabase
        .from('equipment_instances')
        .insert(instances)
        .select();
      if (instanceError) throw instanceError;

      const testTasks = (createdInstances ?? []).flatMap(instance => {
        const config = testConfigs.find(c => c.equipmentType === instance.equipment_type);
        return (config?.templates.filter(t => t.isEnabled) ?? []).map(template => ({
          equipment_instance_id: instance.id,
          test_template_id: template.id,
          status: 'DRAFT' as const,
        }));
      });

      if (testTasks.length > 0) {
        const { error: taskError } = await supabase.from('test_tasks').insert(testTasks);
        if (taskError) throw taskError;
      }

      setAlreadyGenerated(true);
      toast({
        title: 'Success',
        description: `Generated ${instances.length} equipment instances and ${testTasks.length} test tasks`,
      });
      onEquipmentGenerated?.();
    } catch (error) {
      console.error('Error generating equipment:', error);
      toast({ title: 'Error', description: 'Failed to generate equipment instances', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (testConfigs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No equipment types in scope. Add equipment scope first.</p>
        </CardContent>
      </Card>
    );
  }

  const totalTests = calculateTotalTests();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Testing Scope Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Equipment Types</p>
              <p className="text-2xl font-bold">{testConfigs.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Test Tasks</p>
              <p className="text-2xl font-bold">{totalTests}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {testConfigs.map(config => {
              const qty = scopeItems.find(s => s.equipment_type === config.equipmentType)?.quantity ?? 0;
              const enabled = config.templates.filter(t => t.isEnabled).length;
              return (
                <div key={config.equipmentType} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {config.equipmentType}: {qty} × {enabled} tests
                  </span>
                  <span className="font-medium">{qty * enabled} tasks</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Tests by Equipment Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {testConfigs.map(config => {
              const enabledCount = config.templates.filter(t => t.isEnabled).length;
              const totalCount = config.templates.length;
              const allEnabled = enabledCount === totalCount;
              const scopeItem = scopeItems.find(s => s.equipment_type === config.equipmentType);

              return (
                <AccordionItem key={config.equipmentType} value={config.equipmentType}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">{config.equipmentType}</span>
                      <span className="text-sm text-muted-foreground">
                        {enabledCount}/{totalCount} tests • {scopeItem?.quantity ?? 0} equipment
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAll(config.equipmentType, !allEnabled)}
                          disabled={!isEditable}
                        >
                          {allEnabled ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {config.templates.map(template => (
                          <div key={template.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                            <Checkbox
                              checked={template.isEnabled}
                              onCheckedChange={() => handleToggleTest(config.equipmentType, template.id)}
                              disabled={!isEditable}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{template.testName}</p>
                                <span className="text-xs text-muted-foreground">{template.tab}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{template.testCode}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {isEditable && (
            <div className="mt-6 flex items-center justify-between">
              {alreadyGenerated && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Equipment already generated — regeneration disabled
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                <Button onClick={handleSave} disabled={saving} variant="outline">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Testing Scope
                </Button>
                <Button onClick={generateEquipment} disabled={generating || alreadyGenerated}>
                  {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Equipment & Tasks
                </Button>
              </div>
            </div>
          )}

          {!isEditable && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Testing scope cannot be modified when project is {projectStatus.toLowerCase()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
