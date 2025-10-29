import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';

type EquipmentType = 'POWER_TRANSFORMER' | 'SF6_BREAKER' | 'VCB' | 'CT' | 'CVT' | 'LA' | 'ISOLATOR' | 'EARTH_PIT';

type ScopeItem = {
  equipment_type: EquipmentType;
  quantity: number;
};

const EQUIPMENT_TYPES = [
  'POWER_TRANSFORMER',
  'SF6_BREAKER',
  'VCB',
  'CT',
  'CVT',
  'LA',
  'ISOLATOR',
  'EARTH_PIT',
] as const;

interface ScopeManagerProps {
  scopeItems: ScopeItem[];
  onChange: (items: ScopeItem[]) => void;
}

export function ScopeManager({ scopeItems, onChange }: ScopeManagerProps) {
  const [selectedType, setSelectedType] = useState<EquipmentType | ''>('');
  const [quantity, setQuantity] = useState<string>('1');

  const handleAdd = () => {
    if (!selectedType || !quantity) return;
    
    const qty = parseInt(quantity);
    if (qty <= 0) return;

    // Check if equipment type already exists
    const existingIndex = scopeItems.findIndex(item => item.equipment_type === selectedType);
    
    if (existingIndex >= 0) {
      // Update existing quantity
      const updated = [...scopeItems];
      updated[existingIndex].quantity += qty;
      onChange(updated);
    } else {
      // Add new item
      onChange([...scopeItems, { equipment_type: selectedType as EquipmentType, quantity: qty }]);
    }

    // Reset form
    setSelectedType('');
    setQuantity('1');
  };

  const handleRemove = (index: number) => {
    onChange(scopeItems.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    const updated = [...scopeItems];
    updated[index].quantity = newQuantity;
    onChange(updated);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value as EquipmentType | '');
  };

  const availableTypes = EQUIPMENT_TYPES.filter(
    type => !scopeItems.some(item => item.equipment_type === type)
  );

  return (
    <div className="space-y-4">
      {/* Add Equipment Form */}
      <div className="flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="equipment-type">Equipment Type</Label>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger id="equipment-type">
              <SelectValue placeholder="Select equipment type" />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-32 space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <Button onClick={handleAdd} disabled={!selectedType || !quantity}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Scope Items Table */}
      {scopeItems.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment Type</TableHead>
                <TableHead className="w-32">Quantity</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scopeItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.equipment_type}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Total Equipment</TableCell>
                <TableCell colSpan={2}>
                  {scopeItems.reduce((sum, item) => sum + item.quantity, 0)} units
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
          No equipment added yet. Add equipment types and quantities above.
        </div>
      )}
    </div>
  );
}
