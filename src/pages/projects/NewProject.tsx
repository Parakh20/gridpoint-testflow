import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScopeManager } from '@/components/ScopeManager';
import { TestingScopeSelector } from '@/components/TestingScopeSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type EquipmentType = 'POWER_TRANSFORMER' | 'SF6_BREAKER' | 'VCB' | 'CT' | 'CVT' | 'LA' | 'ISOLATOR' | 'EARTH_PIT';

type ProjectFormData = {
  project_number: string;
  site_name: string;
  site_address: string;
  client: string;
  start_date: string;
  end_date: string;
};

type ScopeItem = {
  equipment_type: EquipmentType;
  quantity: number;
};

export default function NewProject() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<ProjectFormData>({
    project_number: '',
    site_name: '',
    site_address: '',
    client: '',
    start_date: '',
    end_date: '',
  });
  
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [testingScope, setTestingScope] = useState<Record<string, any[]>>({});

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    const { project_number, site_name, site_address } = formData;
    if (!project_number || !site_name || !site_address) {
      toast({
        title: 'Required fields missing',
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
        title: 'No equipment defined',
        description: 'Please add at least one equipment type to the scope',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const hasEnabledTests = Object.values(testingScope).some(
      (tests: any[]) => tests.some(t => t.isEnabled)
    );
    if (!hasEnabledTests) {
      toast({
        title: 'No tests selected',
        description: 'Please enable at least one test for the testing scope',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          ...formData,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          created_by: user.id,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create scope items
      const scopeInserts = scopeItems.map(item => ({
        project_id: project.id,
        equipment_type: item.equipment_type,
        quantity: item.quantity,
      }));

      const { error: scopeError } = await supabase
        .from('scope_items')
        .insert(scopeInserts);

      if (scopeError) throw scopeError;

      // Save testing scope configuration
      const testScopeRecords = Object.entries(testingScope).flatMap(
        ([equipmentType, tests]: [string, any[]]) =>
          tests
            .filter(t => t.isEnabled)
            .map(test => ({
              project_id: project.id,
              equipment_type: equipmentType as EquipmentType,
              test_template_id: test.id,
              is_enabled: true,
            }))
      );

      if (testScopeRecords.length > 0) {
        const { error: testScopeError } = await supabase
          .from('project_test_scope')
          .insert(testScopeRecords);
        if (testScopeError) throw testScopeError;
      }

      toast({
        title: 'Project created successfully',
        description: `Project ${formData.project_number} has been created as DRAFT`,
      });

      navigate('/gm');
    } catch (error: any) {
      toast({
        title: 'Error creating project',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalEquipment = scopeItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <DashboardLayout title="Create New Project">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      step >= stepNumber
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {step > stepNumber ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${step >= stepNumber ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {stepNumber === 1 && 'Basic Info'}
                      {stepNumber === 2 && 'Equipment Scope'}
                      {stepNumber === 3 && 'Testing Scope'}
                      {stepNumber === 4 && 'Review'}
                    </p>
                  </div>
                </div>
                {stepNumber < 4 && (
                  <div className={`flex-1 h-0.5 mx-4 ${step > stepNumber ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>Enter the basic details for the new project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_number">Project Number *</Label>
                <Input
                  id="project_number"
                  value={formData.project_number}
                  onChange={(e) => handleInputChange('project_number', e.target.value)}
                  placeholder="e.g., PRJ-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name *</Label>
                <Input
                  id="site_name"
                  value={formData.site_name}
                  onChange={(e) => handleInputChange('site_name', e.target.value)}
                  placeholder="e.g., Main Distribution Center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_address">Site Address *</Label>
                <Textarea
                  id="site_address"
                  value={formData.site_address}
                  onChange={(e) => handleInputChange('site_address', e.target.value)}
                  placeholder="Full site address"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Input
                  id="client"
                  value={formData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  placeholder="Client name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Equipment Scope</CardTitle>
              <CardDescription>Define the equipment to be tested in this project</CardDescription>
            </CardHeader>
            <CardContent>
              <ScopeManager scopeItems={scopeItems} onChange={setScopeItems} />
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Testing Scope</CardTitle>
              <CardDescription>Select which tests should be performed for each equipment type</CardDescription>
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

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Create</CardTitle>
              <CardDescription>Review project details before creating</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Project Information</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Project Number</dt>
                    <dd className="font-medium">{formData.project_number}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Site Name</dt>
                    <dd className="font-medium">{formData.site_name}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Site Address</dt>
                    <dd className="font-medium">{formData.site_address}</dd>
                  </div>
                  {formData.client && (
                    <div>
                      <dt className="text-muted-foreground">Client</dt>
                      <dd className="font-medium">{formData.client}</dd>
                    </div>
                  )}
                  {formData.start_date && (
                    <div>
                      <dt className="text-muted-foreground">Start Date</dt>
                      <dd className="font-medium">{formData.start_date}</dd>
                    </div>
                  )}
                  {formData.end_date && (
                    <div>
                      <dt className="text-muted-foreground">End Date</dt>
                      <dd className="font-medium">{formData.end_date}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Equipment Scope</h3>
                <div className="space-y-2">
                  {scopeItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-md">
                      <span className="font-medium">{item.equipment_type}</span>
                      <span className="text-muted-foreground">{item.quantity} units</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-md font-semibold">
                    <span>Total Equipment</span>
                    <span>{totalEquipment} units</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Testing Scope</h3>
                <div className="space-y-2">
                  {Object.entries(testingScope).map(([equipmentType, tests]: [string, any[]]) => {
                    const enabledTests = tests.filter(t => t.isEnabled);
                    const scopeItem = scopeItems.find(s => s.equipment_type === equipmentType);
                    const quantity = scopeItem?.quantity || 0;
                    const subtotal = quantity * enabledTests.length;

                    return (
                      <div key={equipmentType} className="p-3 bg-muted rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{equipmentType}</span>
                          <span className="text-sm text-muted-foreground">
                            {enabledTests.length} tests × {quantity} units = {subtotal} tasks
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {enabledTests.map(t => t.testCode).join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step === 1 ? navigate('/gm') : handleBack()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 4 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Check className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
