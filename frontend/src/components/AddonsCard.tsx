import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatInr } from '@/lib/format';
import { parseFunctionsErrorBody } from '@/lib/functionsError';
import { captureException } from '@/lib/monitoring';
import { loadRazorpayCheckout } from '@/lib/razorpayCheckout';

type CatalogRow = {
  addon_key: string;
  name: string;
  description: string | null;
  unit_price_inr: number;
  kind: 'quantity' | 'flag';
  max_quantity: number;
  sort_order: number;
};

type ActiveAddon = { addon_key: string; quantity: number };

type Props = {
  companyId?: string;
  companyName?: string;
  userEmail?: string;
  /** False while the company is still on a trial — add-ons need a subscription. */
  hasSubscription: boolean;
  onPurchased: () => void;
};

/**
 * Self-service add-on purchase. Add-ons are one-time Razorpay orders rather
 * than recurring charges: the entitlement is granted by razorpay-webhook once
 * the payment is captured, so nothing here writes the grant locally.
 */
export function AddonsCard({ companyId, companyName, userEmail, hasSubscription, onPurchased }: Props) {
  const { toast } = useToast();
  // Raw input text, not a number: coercing on every keystroke makes the field
  // impossible to retype — clearing it would snap back to 1 and the next digit
  // would append to that instead of replacing it. Empty is allowed while
  // typing and resolved to 1 wherever a real quantity is needed.
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [buyingKey, setBuyingKey] = useState<string | null>(null);

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ['addon-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_catalog')
        .select('addon_key, name, description, unit_price_inr, kind, max_quantity, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  // Active grants, so a flag add-on the company already owns isn't offered
  // again — the purchase would be refused server-side anyway, but showing a
  // buy button for something already owned is its own bug.
  const { data: active = [] } = useQuery({
    queryKey: ['active-addons', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_addons')
        .select('addon_key, quantity, subscriptions!inner(company_id)')
        .eq('status', 'active')
        .eq('subscriptions.company_id', companyId as string);
      if (error) throw error;
      return (data ?? []) as unknown as ActiveAddon[];
    },
    enabled: !!companyId && hasSubscription,
  });

  /** Resolves the typed text to a usable quantity, clamped to the catalogue cap. */
  const quantityOf = (addon: CatalogRow): number => {
    if (addon.kind !== 'quantity') return 1;
    const parsed = Math.trunc(Number(quantities[addon.addon_key] ?? '1'));
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(parsed, addon.max_quantity);
  };

  const activeFlags = new Set(active.map(a => a.addon_key));
  const ownedQuantity = (key: string) =>
    active.filter(a => a.addon_key === key).reduce((sum, a) => sum + a.quantity, 0);

  const handleBuy = async (addon: CatalogRow) => {
    const quantity = quantityOf(addon);
    setBuyingKey(addon.addon_key);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'purchase_addon', addon_key: addon.addon_key, quantity },
      });
      const effectiveData = error ? await parseFunctionsErrorBody(error) : data;
      if (!effectiveData?.order_id) {
        throw new Error((effectiveData?.error as string) ?? error?.message ?? 'Failed to start checkout');
      }

      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error('Razorpay checkout failed to load');

      const checkout = new window.Razorpay({
        key: effectiveData.razorpay_key_id,
        order_id: effectiveData.order_id,
        name: 'TestFlow',
        description: `${effectiveData.addon_name} × ${effectiveData.quantity}`,
        prefill: { name: companyName, email: userEmail },
        handler: () => {
          toast({
            title: 'Payment received',
            description: 'Your add-on is being applied — this can take a few seconds.',
          });
          onPurchased();
        },
        modal: { ondismiss: () => setBuyingKey(null) },
      });
      checkout.open();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      captureException(err, { where: 'AddonsCard.handleBuy', addonKey: addon.addon_key }, 'payment_failure');
      toast({ title: 'Checkout failed', description: message, variant: 'destructive' });
      setBuyingKey(null);
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (catalog.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add-ons</CardTitle>
        <CardDescription>
          One-time purchases that extend your current plan. Prices exclude taxes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSubscription && (
          <p className="text-sm text-muted-foreground">
            Add-ons need an active subscription — subscribe to a plan first.
          </p>
        )}
        {catalog.map(addon => {
          const owned = activeFlags.has(addon.addon_key);
          const isFlagOwned = owned && addon.kind === 'flag';
          const quantity = quantityOf(addon);
          const total = Number(addon.unit_price_inr) * quantity;
          return (
            <div
              key={addon.addon_key}
              className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="min-w-[14rem] flex-1">
                <div className="font-medium">
                  {addon.name}
                  {isFlagOwned && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Active
                    </span>
                  )}
                  {addon.kind === 'quantity' && ownedQuantity(addon.addon_key) > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {ownedQuantity(addon.addon_key)} purchased
                    </span>
                  )}
                </div>
                {addon.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{addon.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                  {formatInr(Number(addon.unit_price_inr))}
                  {addon.kind === 'quantity' ? ' each' : ' one-time'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {addon.kind === 'quantity' && (
                  <input
                    type="number"
                    min={1}
                    max={addon.max_quantity}
                    value={quantities[addon.addon_key] ?? '1'}
                    aria-label={`Quantity of ${addon.name}`}
                    disabled={!hasSubscription || buyingKey !== null}
                    onChange={e => {
                      // Digits only. The clamp itself happens in quantityOf, so
                      // the field stays freely editable while the price shown
                      // never exceeds what will actually be charged.
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setQuantities(prev => ({ ...prev, [addon.addon_key]: raw }));
                    }}
                    onBlur={() => setQuantities(prev => ({
                      ...prev, [addon.addon_key]: String(quantityOf(addon)),
                    }))}
                    className="h-10 w-20 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                )}
                <Button
                  variant={isFlagOwned ? 'outline' : 'default'}
                  disabled={!hasSubscription || isFlagOwned || buyingKey !== null}
                  onClick={() => handleBuy(addon)}
                >
                  {buyingKey === addon.addon_key && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isFlagOwned ? 'Active' : `Buy — ${formatInr(total)}`}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
