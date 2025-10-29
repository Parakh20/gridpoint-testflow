import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Database } from '@/integrations/supabase/types';

type EquipmentType = Database['public']['Enums']['equipment_type'];

interface TestTemplate {
  id: string;
  testName: string;
  testCode: string;
  tab: string;
  isEnabled: boolean;
}

interface TestScopeConfig {
  equipmentType: EquipmentType;
  templates: TestTemplate[];
}

interface ScopeItem {
  equipment_type: EquipmentType;
  quantity: number;
}

interface TestingScopeSelectorProps {
  scopeItems: ScopeItem[];
  testingScope: Record<string, TestTemplate[]>;
  onChange: (scope: Record<string, TestTemplate[]>) => void;
  readOnly?: boolean;
}

export function TestingScopeSelector({
  scopeItems,
  testingScope,
  onChange,
  readOnly = false,
}: TestingScopeSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [testConfigs, setTestConfigs] = useState<TestScopeConfig[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchTestTemplates();
  }, [scopeItems]);

  useEffect(() => {
    // Sync testConfigs with testingScope prop
    if (Object.keys(testingScope).length > 0) {
      const configs = Object.entries(testingScope).map(([equipmentType, templates]) => ({
        equipmentType: equipmentType as EquipmentType,
        templates,
      }));
      setTestConfigs(configs);
    }
  }, [testingScope]);

  const fetchTestTemplates = async () => {
    try {
      setLoading(true);
      const equipmentTypes = scopeItems.map(item => item.equipment_type);

      if (equipmentTypes.length === 0) {
        setTestConfigs([]);
        setLoading(false);
        return;
      }

      // Fetch all test templates for equipment types in scope
      const { data: templatesData, error: templatesError } = await supabase
        .from('test_templates')
        .select('*')
        .in('equipment_type', equipmentTypes)
        .eq('is_active', true);

      if (templatesError) throw templatesError;

      // Group templates by equipment type
      const configsByType: Record<string, TestScopeConfig> = {};

      equipmentTypes.forEach(equipType => {
        const templates = (templatesData || [])
          .filter(t => t.equipment_type === equipType)
          .map(template => ({
            id: template.id,
            testName: template.test_name,
            testCode: template.test_code,
            tab: template.tab,
            isEnabled: true, // Default to enabled
          }));

        configsByType[equipType] = {
          equipmentType: equipType,
          templates,
        };
      });

      const configs = Object.values(configsByType);
      setTestConfigs(configs);

      // Initialize parent state with all tests enabled
      const initialScope: Record<string, TestTemplate[]> = {};
      configs.forEach(config => {
        initialScope[config.equipmentType] = config.templates;
      });
      onChange(initialScope);
    } catch (error) {
      console.error('Error fetching test templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTest = (equipmentType: string, testId: string) => {
    const updatedConfigs = testConfigs.map(config =>
      config.equipmentType === equipmentType
        ? {
            ...config,
            templates: config.templates.map(t =>
              t.id === testId ? { ...t, isEnabled: !t.isEnabled } : t
            ),
          }
        : config
    );
    setTestConfigs(updatedConfigs);

    // Update parent state
    const updatedScope: Record<string, TestTemplate[]> = {};
    updatedConfigs.forEach(config => {
      updatedScope[config.equipmentType] = config.templates;
    });
    onChange(updatedScope);
  };

  const handleToggleAll = (equipmentType: string, enabled: boolean) => {
    const updatedConfigs = testConfigs.map(config =>
      config.equipmentType === equipmentType
        ? {
            ...config,
            templates: config.templates.map(t => ({ ...t, isEnabled: enabled })),
          }
        : config
    );
    setTestConfigs(updatedConfigs);

    // Update parent state
    const updatedScope: Record<string, TestTemplate[]> = {};
    updatedConfigs.forEach(config => {
      updatedScope[config.equipmentType] = config.templates;
    });
    onChange(updatedScope);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (testConfigs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No equipment types in scope. Add equipment scope first.</p>
      </div>
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
                  {!readOnly && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAll(config.equipmentType, !allEnabled)}
                      >
                        {allEnabled ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {config.templates.map(template => (
                      <div
                        key={template.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border"
                      >
                        <Checkbox
                          checked={template.isEnabled}
                          onCheckedChange={() => handleToggleTest(config.equipmentType, template.id)}
                          disabled={readOnly}
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
    </div>
  );
}
