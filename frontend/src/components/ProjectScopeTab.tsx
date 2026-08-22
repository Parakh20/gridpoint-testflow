import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PackageSearch } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

interface ScopeItem {
  id: string;
  equipment_type: string;
  quantity: number;
}

interface ProjectScopeTabProps {
  projectId: string;
}

export function ProjectScopeTab({ projectId }: ProjectScopeTabProps) {
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScopeItems();
  }, [projectId]);

  const fetchScopeItems = async () => {
    try {
      const { data, error } = await supabase
        .from('scope_items')
        .select('*')
        .eq('project_id', projectId)
        .order('equipment_type');

      if (error) throw error;
      setScopeItems(data || []);
    } catch (error) {
      console.error('Error fetching scope items:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalQuantity = scopeItems.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (scopeItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-4">
          <EmptyState
            icon={<PackageSearch size={28} />}
            title="No equipment scope defined"
            description="Define equipment types and quantities in the New Project wizard or Edit Project screen."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Scope</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipment Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scopeItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.equipment_type.replace(/_/g, ' ')}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
              <TableCell>Total Equipment</TableCell>
              <TableCell className="text-right">{totalQuantity}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
