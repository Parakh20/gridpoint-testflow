import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Save, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface TestTemplate {
  id: string;
  test_name: string;
  test_code: string;
  tab: string;
  equipment_type: string;
}

import type { Database } from '@/integrations/supabase/types';

type EquipmentType = Database['public']['Enums']['equipment_type'];

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
  const [testConfigs, setTestConfigs] = useState<TestScopeConfig[]>([]);
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const { toast } = useToast();

  const isEditable = projectStatus === 'DRAFT' || projectStatus === 'APPROVED';

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch scope items for this project
      const { data: scopeData, error: scopeError } = await supabase
        .from('scope_items')
        .select('equipment_type, quantity')
        .eq('project_id', projectId);

      if (scopeError) throw scopeError;
      setScopeItems(scopeData || []);

      const equipmentTypes = scopeData?.map(item => item.equipment_type) || [];

      // Fetch all test templates for equipment types in scope
      const { data: templatesData, error: templatesError } = await supabase
        .from('test_templates')
        .select('*')
        .in('equipment_type', equipmentTypes)
        .eq('is_active', true);

      if (templatesError) throw templatesError;

      // Fetch existing test scope configuration
      const { data: scopeData2, error: scopeError2 } = await supabase
        .from('project_test_scope')
        .select('*')
        .eq('project_id', projectId);

      if (scopeError2) throw scopeError2;

      // Group templates by equipment type
      const configsByType: { [key: string]: TestScopeConfig } = {};

      equipmentTypes.forEach(equipType => {
        const templates = (templatesData || [])
          .filter(t => t.equipment_type === equipType)
          .map(template => {
            const existingScope = scopeData2?.find(s => s.test_template_id === template.id);
            return {
              id: template.id,
              testName: template.test_name,
              testCode: template.test_code,
              tab: template.tab,
              isEnabled: existingScope ? existingScope.is_enabled : true, // Default to enabled
            };
          });

        configsByType[equipType] = {
          equipmentType: equipType,
          templates,
        };
      });

      setTestConfigs(Object.values(configsByType));
    } catch (error) {
      console.error('Error fetching testing scope:', error);
      toast({
        title: 'Error',
        description: 'Failed to load testing scope',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTest = (equipmentType: string, testId: string) => {
    setTestConfigs(prev =>
      prev.map(config =>
        config.equipmentType === equipmentType
          ? {
              ...config,
              templates: config.templates.map(t =>
                t.id === testId ? { ...t, isEnabled: !t.isEnabled } : t
              ),
            }
          : config
      )
    );
  };

  const handleToggleAll = (equipmentType: string, enabled: boolean) => {
    setTestConfigs(prev =>
      prev.map(config =>
        config.equipmentType === equipmentType
          ? {
              ...config,
              templates: config.templates.map(t => ({ ...t, isEnabled: enabled })),
            }
          : config
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Delete existing test scope for this project
      await supabase
        .from('project_test_scope')
        .delete()
        .eq('project_id', projectId);

      // Insert new test scope configuration
      const scopeRecords = testConfigs.flatMap(config =>
        config.templates.map(template => ({
          project_id: projectId,
          equipment_type: config.equipmentType as EquipmentType,
          test_template_id: template.id,
          is_enabled: template.isEnabled,
        }))
      );

      if (scopeRecords.length > 0) {
        const { error } = await supabase
          .from('project_test_scope')
          .insert(scopeRecords);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Testing scope saved successfully',
      });
    } catch (error) {
      console.error('Error saving testing scope:', error);
      toast({
        title: 'Error',
        description: 'Failed to save testing scope',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalTests = () => {
    let total = 0;
    testConfigs.forEach(config => {
      const scopeItem = scopeItems.find(s => s.equipment_type === config.equipmentType);
      const quantity = scopeItem?.quantity || 0;
      const enabledTests = config.templates.filter(t => t.isEnabled).length;
      total += quantity * enabledTests;
    });
    return total;
  };

  const generateEquipment = async () => {
    setGenerating(true);
    try {
      if (!scopeItems || scopeItems.length === 0) {
        toast({
          title: 'No Scope Defined',
          description: 'Please define equipment scope first',
          variant: 'destructive',
        });
        return;
      }

      const enabledTests = testConfigs.filter(config => 
        config.templates.some(t => t.isEnabled)
      );

      if (enabledTests.length === 0) {
        toast({
          title: 'No Tests Selected',
          description: 'Please select at least one test before generating equipment',
          variant: 'destructive',
        });
        return;
      }

      // Generate equipment instances - first fetch scope items with IDs
      const { data: fetchedScopeItems, error: fetchScopeError } = await supabase
        .from('scope_items')
        .select('*')
        .eq('project_id', projectId);

      if (fetchScopeError) throw fetchScopeError;

      const instances: any[] = [];
      for (const scopeItem of fetchedScopeItems || []) {
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

      // Create test tasks based on enabled tests
      const testTasks: any[] = [];
      for (const instance of createdInstances || []) {
        const config = testConfigs.find(c => c.equipmentType === instance.equipment_type);
        const enabledTemplates = config?.templates.filter(t => t.isEnabled) || [];

        for (const template of enabledTemplates) {
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

      onEquipmentGenerated?.();
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
      {/* Summary Card */}
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
              const scopeItem = scopeItems.find(s => s.equipment_type === config.equipmentType);
              const quantity = scopeItem?.quantity || 0;
              const enabledTests = config.templates.filter(t => t.isEnabled).length;
              const subtotal = quantity * enabledTests;

              return (
                <div key={config.equipmentType} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {config.equipmentType}: {quantity} × {enabledTests} tests
                  </span>
                  <span className="font-medium">{subtotal} tasks</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Test Configuration */}
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
                        {enabledCount}/{totalCount} tests • {scopeItem?.quantity || 0} equipment
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
                          <div
                            key={template.id}
                            className="flex items-start space-x-3 p-3 rounded-lg border"
                          >
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
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Testing Scope
              </Button>
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
