import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { platformFetch } from './platformFetch';
import { COMPANY_FLAG_LABEL } from './planTypes';

/**
 * Per-company operational feature flags (`companies.features` JSONB).
 *
 * These are NOT billing entitlements. Entitlements come from the plan, an
 * enterprise contract, or an add-on and are resolved by
 * get_company_entitlements(); these flags are kill switches for shipped
 * functionality, read by frontend/src/lib/features.ts and has_feature(). To
 * grant one company a raised cap or a paid feature, use the enterprise
 * contract or add-on panels instead — those are what entitlement checks read.
 *
 * Defaults are open: a key absent from the JSONB means enabled. Turning a
 * switch off writes an explicit `false`.
 */
export function CompanyFeatureFlagsPanel({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await platformFetch('get_company_feature_flags', { company_id: companyId });
        if (cancelled) return;
        setFlags((res.features ?? {}) as Record<string, boolean>);
        setKeys((res.flag_keys ?? []) as string[]);
      } catch (err: any) {
        if (!cancelled) toast({ variant: 'destructive', title: 'Failed to load feature flags', description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const save = async (next: Record<string, boolean>) => {
    setSaving(true);
    try {
      const res = await platformFetch('set_company_feature_flags', {
        company_id: companyId, features: next, actor: 'platform-admin',
      });
      setFlags((res.features ?? {}) as Record<string, boolean>);
      toast({ title: 'Feature flags updated' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to save feature flags', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: string, enabled: boolean) => save({ ...flags, [key]: enabled });

  const resetToDefaults = () => save({});

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <Label className="text-sm font-medium">Company feature flags</Label>
        <p className="text-xs text-muted-foreground">
          Operational kill switches, not billing entitlements. Unset means enabled.
        </p>
      </div>

      <div className="space-y-2">
        {keys.map((key) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm">{COMPANY_FLAG_LABEL[key] ?? key}</div>
              {flags[key] === undefined && (
                <div className="text-xs text-muted-foreground">default (enabled)</div>
              )}
            </div>
            <Switch
              aria-label={COMPANY_FLAG_LABEL[key] ?? key}
              disabled={saving}
              checked={flags[key] !== false}
              onCheckedChange={(v) => toggle(key, v)}
            />
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" disabled={saving} onClick={resetToDefaults}>
        Reset all to default
      </Button>
    </div>
  );
}
