import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { platformFetch } from './platformFetch';
import { formatInr } from './BillingTab';
import { EnterpriseContract } from './billingTypes';

interface Props {
  companyId: string;
  contract: EnterpriseContract | null;
  onChanged: () => void;
}

export function EnterpriseContractsPanel({ companyId, contract, onChanged }: Props) {
  const { toast } = useToast();
  const [acting, setActing] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [maxUsersInput, setMaxUsersInput] = useState('');
  const [maxProjectsInput, setMaxProjectsInput] = useState('');
  const [contractEndInput, setContractEndInput] = useState('');
  const [slaLevelInput, setSlaLevelInput] = useState('');

  const createContract = async () => {
    setActing(true);
    try {
      await platformFetch('admin_create_enterprise_contract', {
        company_id: companyId,
        actor: 'platform-admin',
        fields: {
          custom_monthly_price_inr: priceInput ? Number(priceInput) : null,
          max_users: maxUsersInput ? Number(maxUsersInput) : null,
          max_active_projects: maxProjectsInput ? Number(maxProjectsInput) : null,
          contract_end: contractEndInput || null,
          sla_level: slaLevelInput || null,
        },
      });
      toast({ title: 'Enterprise contract created' });
      onChanged();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action failed', description: err.message });
    } finally {
      setActing(false);
    }
  };

  if (contract) {
    return (
      <div className="space-y-2">
        <Label>Enterprise contract</Label>
        <div className="rounded-lg border p-4 space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Custom price: </span>
            {contract.custom_monthly_price_inr != null ? formatInr(contract.custom_monthly_price_inr) : '—'}/mo
          </div>
          <div>
            <span className="text-muted-foreground">Max users: </span>
            {contract.max_users ?? 'Unlimited'}
          </div>
          <div>
            <span className="text-muted-foreground">Max projects: </span>
            {contract.max_active_projects ?? 'Unlimited'}
          </div>
          <div>
            <span className="text-muted-foreground">SLA level: </span>
            {contract.sla_level ?? '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Support level: </span>
            {contract.support_level ?? '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Contract window: </span>
            {formatDate(contract.contract_start)} – {contract.contract_end ? formatDate(contract.contract_end) : 'open-ended'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Enterprise contract</Label>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ec-price" className="text-xs">Custom monthly price (INR)</Label>
            <Input id="ec-price" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ec-sla" className="text-xs">SLA level</Label>
            <Input id="ec-sla" value={slaLevelInput} onChange={(e) => setSlaLevelInput(e.target.value)} placeholder="gold" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ec-max-users" className="text-xs">Max users</Label>
            <Input id="ec-max-users" value={maxUsersInput} onChange={(e) => setMaxUsersInput(e.target.value)} placeholder="Unlimited" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ec-max-projects" className="text-xs">Max active projects</Label>
            <Input id="ec-max-projects" value={maxProjectsInput} onChange={(e) => setMaxProjectsInput(e.target.value)} placeholder="Unlimited" />
          </div>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="ec-end" className="text-xs">Contract end</Label>
            <Input id="ec-end" type="date" value={contractEndInput} onChange={(e) => setContractEndInput(e.target.value)} />
          </div>
        </div>
        <Button
          disabled={
            acting ||
            !(priceInput || maxUsersInput || maxProjectsInput || contractEndInput || slaLevelInput)
          }
          onClick={createContract}
        >
          Create contract
        </Button>
      </div>
    </div>
  );
}
