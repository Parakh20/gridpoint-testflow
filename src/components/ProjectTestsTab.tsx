import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TestTask {
  id: string;
  status: string;
  equipment_instance: {
    label: string;
    equipment_type: string;
  };
  test_template: {
    test_name: string;
    test_code: string;
  };
}

interface ProjectTestsTabProps {
  projectId: string;
}

export function ProjectTestsTab({ projectId }: ProjectTestsTabProps) {
  const [testTasks, setTestTasks] = useState<TestTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestTasks();
  }, [projectId]);

  const fetchTestTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('test_tasks')
        .select(`
          id,
          status,
          equipment_instance:equipment_instances(label, equipment_type),
          test_template:test_templates(test_name, test_code)
        `)
        .eq('equipment_instance.project_id', projectId)
        .order('created_at');

      if (error) throw error;
      setTestTasks(data as any || []);
    } catch (error) {
      console.error('Error fetching test tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedTests = testTasks.filter((t) => t.status === 'APPROVED').length;
  const completionPercentage = testTasks.length > 0
    ? Math.round((completedTests / testTasks.length) * 100)
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (testTasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">
            No test tasks available. Generate equipment instances first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Test Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">
              {completedTests} / {testTasks.length} ({completionPercentage}%)
            </span>
          </div>
          <Progress value={completionPercentage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Tasks ({testTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Test Code</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    {task.equipment_instance?.label || 'N/A'}
                  </TableCell>
                  <TableCell>{task.test_template?.test_name || 'N/A'}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {task.test_template?.test_code || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={task.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
