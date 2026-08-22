import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { platformFetch } from './platformFetch';
import { SubscriptionAddon } from './billingTypes';
import { EmptyState } from '@/components/EmptyState';
import { ADDON_KEYS } from '@testflow/shared';

interface Props {
  companyId: string;
  addons: SubscriptionAddon[];
  onChanged: () => void;
}

export function SubscriptionAddonsPanel({ companyId, addons, onChanged }: Props) {
  const { toast } = useToast();
  const [acting, setActing] = useState(false);
  const [addonKeyInput, setAddonKeyInput] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [unitPriceInput, setUnitPriceInput] = useState('');

  const cancelAddon = async (addonId: string) => {
    setActing(true);
    try {
      await platformFetch('admin_cancel_addon', { addon_id: addonId, company_id: companyId, actor: 'platform-admin' });
      toast({ title: 'Add-on cancelled' });
      onChanged();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message });
    } finally {
      setActing(false);
    }
  };

  const createAddon = async () => {
    if (!addonKeyInput) return;
    setActing(true);
    try {
      await platformFetch('admin_create_addon', {
        company_id: companyId,
        addon_key: addonKeyInput,
        quantity: Number(quantityInput),
        unit_price_inr: unitPriceInput ? Number(unitPriceInput) : null,
        actor: 'platform-admin',
      });
      toast({ title: 'Add-on created' });
      setAddonKeyInput('');
      setQuantityInput('1');
      setUnitPriceInput('');
      onChanged();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message });
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Subscription add-ons</Label>

      {addons.length === 0 ? (
        <EmptyState title="No add-ons yet" description="This subscription has no add-ons attached." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {addons.map((addon) => (
              <TableRow key={addon.id}>
                <TableCell>{addon.addon_key}</TableCell>
                <TableCell>{addon.quantity}</TableCell>
                <TableCell><Badge>{addon.status}</Badge></TableCell>
                <TableCell>{formatDate(addon.created_at)}</TableCell>
                <TableCell>
                  {addon.status === 'active' && (
                    <Button variant="outline" size="sm" disabled={acting} onClick={() => cancelAddon(addon.id)}>
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="rounded-lg border p-4 space-y-3">
        <Label className="text-xs">Add add-on</Label>
        <div className="grid grid-cols-3 gap-3">
          <Select value={addonKeyInput} onValueChange={setAddonKeyInput}>
            <SelectTrigger>
              <SelectValue placeholder="Add-on key" />
            </SelectTrigger>
            <SelectContent>
              {ADDON_KEYS.map((key) => (
                <SelectItem key={key} value={key}>{key}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={quantityInput} onChange={(e) => setQuantityInput(e.target.value)} placeholder="Quantity" />
          <Input value={unitPriceInput} onChange={(e) => setUnitPriceInput(e.target.value)} placeholder="Unit price (INR, optional)" />
        </div>
        <Button disabled={acting || !addonKeyInput} onClick={createAddon}>Add add-on</Button>
      </div>
    </div>
  );
}
