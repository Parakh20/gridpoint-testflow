import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScopeManager } from '@/components/ScopeManager';
import { TestingScopeSelector } from '@/components/TestingScopeSelector';
import { SupervisorSelector } from '@/components/SupervisorSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardPath } from '@/lib/routes';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type EquipmentType = Database['public']['Enums']['equipment_type'];

interface ScopeItem {
  equipment_type: EquipmentType;
  quantity: number;
}

export default function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    project_number: '',
    site_name: '',
    site_address: '',
    client: '',
    start_date: '',
    end_date: '',
    assigned_to: null as string | null,
  });

  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [testingScope, setTestingScope] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    if (!id) return;

    try {
      // Fetch project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      // Truncate to YYYY-MM-DD — HTML date inputs reject timestamps
      const toDateInput = (v: string | null) => (v ? v.slice(0, 10) : '');

      setFormData({
        project_number: project.project_number,
        site_name: project.site_name,
        site_address: project.site_address,
        client: project.client || '',
        start_date: toDateInput(project.start_date),
        end_date: toDateInput(project.end_date),
        assigned_to: project.assigned_to || null,
      });

      // Fetch scope items
      const { data: scope, error: scopeError } = await supabase
        .from('scope_items')
        .select('equipment_type, quantity')
        .eq('project_id', id);

      if (scopeError) throw scopeError;
      setScopeItems(scope || []);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      });
      navigate(dashboardPath(userRole));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateStep1 = () => {
    if (!formData.project_number || !formData.site_name || !formData.site_address) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (scopeItems.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one equipment type',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const hasEnabledTests = Object.values(testingScope).some(templates =>
      templates.some(t => t.isEnabled)
    );
    if (!hasEnabledTests) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one test',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3()) return;

    setSaving(true);
    try {
      // Update project
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          project_number: formData.project_number,
          site_name: formData.site_name,
          site_address: formData.site_address,
          client: formData.client || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          assigned_to: formData.assigned_to,
        })
        .eq('id', id);

      if (projectError) throw projectError;

      // Delete existing scope items
      const { error: deleteError } = await supabase
        .from('scope_items')
        .delete()
        .eq('project_id', id);

      if (deleteError) throw deleteError;

      // Insert new scope items
      const scopeData = scopeItems.map((item) => ({
        project_id: id!,
        equipment_type: item.equipment_type as any,
        quantity: item.quantity,
      }));

      const { error: scopeError } = await supabase
        .from('scope_items')
        .insert(scopeData);

      if (scopeError) throw scopeError;

      // Update testing scope
      const { error: deleteTestScopeError } = await supabase
        .from('project_test_scope')
        .delete()
        .eq('project_id', id);

      if (deleteTestScopeError) throw deleteTestScopeError;

      const testScopeRecords: any[] = [];
      Object.entries(testingScope).forEach(([equipmentType, templates]) => {
        templates.forEach((template: any) => {
          testScopeRecords.push({
            project_id: id,
            equipment_type: equipmentType,
            test_template_id: template.id,
            is_enabled: template.isEnabled,
          });
        });
      });

      if (testScopeRecords.length > 0) {
        const { error: testScopeError } = await supabase
          .from('project_test_scope')
          .insert(testScopeRecords);

        if (testScopeError) throw testScopeError;
      }

      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });

      navigate(`/projects/${id}`);
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Project">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Project">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/projects/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                  currentStep >= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step}
              </div>
              <span
                className={`text-sm font-medium ${
                  currentStep >= step ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step === 1 ? 'Basic Info' : step === 2 ? 'Equipment Scope' : 'Testing Scope'}
              </span>
              {idx < 2 && <div className="w-12 h-0.5 bg-muted mx-2" />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_number">
                  Project Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="project_number"
                  name="project_number"
                  value={formData.project_number}
                  onChange={handleInputChange}
                  placeholder="e.g., PRJ-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_name">
                  Site Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="site_name"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Distribution Center"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_address">
                  Site Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="site_address"
                  name="site_address"
                  value={formData.site_address}
                  onChange={handleInputChange}
                  placeholder="Full site address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Input
                  id="client"
                  name="client"
                  value={formData.client}
                  onChange={handleInputChange}
                  placeholder="Client name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <SupervisorSelector
                value={formData.assigned_to || undefined}
                onChange={(supervisorId) => setFormData({ ...formData, assigned_to: supervisorId })}
                label="Assigned Supervisor"
              />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Equipment Scope */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Equipment Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <ScopeManager 
                scopeItems={scopeItems as any} 
                onChange={(items) => setScopeItems(items as any)} 
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Testing Scope */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Testing Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <TestingScopeSelector
                scopeItems={scopeItems}
                testingScope={testingScope}
                onChange={setTestingScope}
              />
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${id}`)}
            >
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
