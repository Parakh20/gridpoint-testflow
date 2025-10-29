import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer, Download } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

interface ProjectPDFExportProps {
  project: {
    id: string;
    project_number: string;
    site_name: string;
    site_address: string;
    client: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  };
  onClose: () => void;
}

export function ProjectPDFExport({ project, onClose }: ProjectPDFExportProps) {
  const [loading, setLoading] = useState(true);
  const [scopeItems, setScopeItems] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [testStats, setTestStats] = useState({ total: 0, completed: 0, pass: 0, fail: 0 });
  const [testingScope, setTestingScope] = useState<Record<string, any[]>>({});
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [project.id]);

  const fetchData = async () => {
    try {
      // Fetch scope
      const { data: scope } = await supabase
        .from('scope_items')
        .select('*')
        .eq('project_id', project.id);

      // Fetch equipment
      const { data: equip } = await supabase
        .from('equipment_instances')
        .select('*')
        .eq('project_id', project.id);

      // Fetch test tasks
      const { data: tests } = await supabase
        .from('test_tasks')
        .select(`
          id,
          status,
          equipment_instance:equipment_instances!inner(project_id)
        `)
        .eq('equipment_instance.project_id', project.id);

      const completed = tests?.filter((t) => t.status === 'APPROVED').length || 0;
      const { data: testRecords } = await supabase
        .from('test_records')
        .select('pass_fail')
        .in('test_task_id', tests?.map((t) => t.id) || []);

      const pass = testRecords?.filter((r) => r.pass_fail === 'PASS').length || 0;
      const fail = testRecords?.filter((r) => r.pass_fail === 'FAIL').length || 0;

      // Fetch testing scope
      const { data: testScope } = await supabase
        .from('project_test_scope')
        .select(`
          id,
          equipment_type,
          is_enabled,
          test_template:test_templates(
            test_code,
            test_name,
            tab
          )
        `)
        .eq('project_id', project.id)
        .eq('is_enabled', true)
        .order('equipment_type');

      // Group by equipment type
      const groupedScope = testScope?.reduce((acc: Record<string, any[]>, item: any) => {
        if (!acc[item.equipment_type]) {
          acc[item.equipment_type] = [];
        }
        acc[item.equipment_type].push(item.test_template);
        return acc;
      }, {});

      setScopeItems(scope || []);
      setEquipment(equip || []);
      setTestingScope(groupedScope || {});
      setTestStats({
        total: tests?.length || 0,
        completed,
        pass,
        fail,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalEquipment = scopeItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full">
        <DialogHeader className="print:hidden">
          <DialogTitle>Test Plan Report</DialogTitle>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div ref={printRef} className="space-y-6 print:p-8">
            {/* Cover Page */}
            <div className="text-center space-y-4 pb-8 border-b print:page-break-after-always">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-semibold">TestFlow</div>
                <h1 className="text-3xl font-bold">Electrical Testing Test Plan</h1>
              </div>
              <div className="space-y-1 mt-8">
                <h2 className="text-2xl font-semibold">{project.project_number}</h2>
                <p className="text-lg text-muted-foreground">{project.site_name}</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <StatusBadge status={project.status} />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-8">
                Generated: {new Date().toLocaleString()}
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Project Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Project Number:</span>
                  <p className="text-muted-foreground">{project.project_number}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="mt-1">
                    <StatusBadge status={project.status} />
                  </div>
                </div>
                <div>
                  <span className="font-medium">Site Name:</span>
                  <p className="text-muted-foreground">{project.site_name}</p>
                </div>
                <div>
                  <span className="font-medium">Client:</span>
                  <p className="text-muted-foreground">{project.client || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Site Address:</span>
                  <p className="text-muted-foreground">{project.site_address}</p>
                </div>
                <div>
                  <span className="font-medium">Start Date:</span>
                  <p className="text-muted-foreground">
                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">End Date:</span>
                  <p className="text-muted-foreground">
                    {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Equipment Scope */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Equipment Scope</h3>
              <table className="w-full border-collapse border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left">Equipment Type</th>
                    <th className="border p-2 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {scopeItems.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2">{item.equipment_type.replace(/_/g, ' ')}</td>
                      <td className="border p-2 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-muted">
                    <td className="border p-2">Total Equipment</td>
                    <td className="border p-2 text-right">{totalEquipment}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Testing Scope */}
            {Object.keys(testingScope).length > 0 && (
              <div className="space-y-4 print:page-break-before-always">
                <h3 className="text-xl font-semibold">Testing Scope</h3>
                <p className="text-sm text-muted-foreground">
                  The following tests are configured for each equipment type in this project:
                </p>
                
                {/* Summary Statistics */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="border p-3 rounded">
                    <p className="text-xs text-muted-foreground">Equipment Types</p>
                    <p className="text-xl font-bold">{Object.keys(testingScope).length}</p>
                  </div>
                  <div className="border p-3 rounded">
                    <p className="text-xs text-muted-foreground">Total Test Types</p>
                    <p className="text-xl font-bold">
                      {Object.values(testingScope).reduce((sum: number, tests: any[]) => sum + tests.length, 0)}
                    </p>
                  </div>
                  <div className="border p-3 rounded">
                    <p className="text-xs text-muted-foreground">Expected Test Tasks</p>
                    <p className="text-xl font-bold">{testStats.total}</p>
                  </div>
                </div>

                {/* Test Details by Equipment Type */}
                {Object.entries(testingScope).map(([equipmentType, tests]) => (
                  <div key={equipmentType} className="space-y-2">
                    <h4 className="font-semibold text-lg border-b pb-2">
                      {equipmentType.replace(/_/g, ' ')}
                    </h4>
                    <table className="w-full border-collapse border text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left w-24">Test Code</th>
                          <th className="border p-2 text-left">Test Name</th>
                          <th className="border p-2 text-left w-32">Tab</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map((test: any, idx: number) => (
                          <tr key={idx}>
                            <td className="border p-2 font-mono text-xs">{test.test_code}</td>
                            <td className="border p-2">{test.test_name}</td>
                            <td className="border p-2 text-sm">{test.tab}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* Equipment List */}
            {equipment.length > 0 && (
              <div className="space-y-4 print:page-break-before-always">
                <h3 className="text-xl font-semibold">Equipment List</h3>
                <table className="w-full border-collapse border text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Label</th>
                      <th className="border p-2 text-left">Type</th>
                      <th className="border p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((item) => (
                      <tr key={item.id}>
                        <td className="border p-2 font-medium">{item.label}</td>
                        <td className="border p-2">{item.equipment_type.replace(/_/g, ' ')}</td>
                        <td className="border p-2">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Test Summary */}
            {testStats.total > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Test Results Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border p-4 rounded">
                    <p className="text-sm text-muted-foreground">Total Tests</p>
                    <p className="text-2xl font-bold">{testStats.total}</p>
                  </div>
                  <div className="border p-4 rounded">
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{testStats.completed}</p>
                  </div>
                  <div className="border p-4 rounded">
                    <p className="text-sm text-muted-foreground">Pass</p>
                    <p className="text-2xl font-bold text-green-600">{testStats.pass}</p>
                  </div>
                  <div className="border p-4 rounded">
                    <p className="text-sm text-muted-foreground">Fail</p>
                    <p className="text-2xl font-bold text-red-600">{testStats.fail}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
