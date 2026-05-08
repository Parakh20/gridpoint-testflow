import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckSquare, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  /** When provided, only these template IDs are pre-checked (used by EditProject to restore saved scope) */
  initialEnabledIds?: Set<string>;
}

export function TestingScopeSelector({
  scopeItems,
  testingScope,
  onChange,
  readOnly = false,
  initialEnabledIds,
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
            // If caller supplies saved IDs, restore their enabled state; otherwise default all on
            isEnabled: initialEnabledIds ? initialEnabledIds.has(template.id) : true,
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

  const handleToggleAll = (equipmentType: string) => {
    const config = testConfigs.find(c => c.equipmentType === equipmentType);
    if (!config) return;
    
    const allEnabled = config.templates.every(t => t.isEnabled);
    const enabled = !allEnabled;
    
    const updatedConfigs = testConfigs.map(c =>
      c.equipmentType === equipmentType
        ? {
            ...c,
            templates: c.templates.map(t => ({ ...t, isEnabled: enabled })),
          }
        : c
    );
    setTestConfigs(updatedConfigs);

    // Update parent state
    const updatedScope: Record<string, TestTemplate[]> = {};
    updatedConfigs.forEach(c => {
      updatedScope[c.equipmentType] = c.templates;
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
    <div className="space-y-3">
      {testConfigs.map(config => {
        const enabledCount = config.templates.filter(t => t.isEnabled).length;
        const totalCount = config.templates.length;
        const allEnabled = enabledCount === totalCount;
        const scopeItem = scopeItems.find(s => s.equipment_type === config.equipmentType);
        const quantity = scopeItem?.quantity || 0;
        const taskCount = enabledCount * quantity;

        return (
          <Card key={config.equipmentType} className="overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-base">
                    {config.equipmentType.replace(/_/g, ' ')}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {enabledCount}/{totalCount} tests • {quantity} equipment • {taskCount} tasks
                  </span>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => handleToggleAll(config.equipmentType)}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    {allEnabled ? (
                      <>
                        <Square className="h-4 w-4" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4" />
                        Select All
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="p-3">
              <div className="space-y-1">
                {config.templates.map(template => (
                  <label
                    key={template.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 transition-colors cursor-pointer group"
                  >
                    <Checkbox
                      checked={template.isEnabled}
                      onCheckedChange={() => handleToggleTest(config.equipmentType, template.id)}
                      disabled={readOnly}
                    />
                    <span className="flex-1 text-sm">
                      {template.testName}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {template.testCode}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </Card>
        );
      })}

      <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground border-t">
        <span>Total: {testConfigs.length} equipment types</span>
        <span className="font-semibold">{totalTests} test tasks expected</span>
      </div>
    </div>
  );
}
