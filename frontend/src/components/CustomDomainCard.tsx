import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useFeatureEntitlement } from '@/lib/entitlements';
import { useToast } from '@/hooks/use-toast';
import { FEATURES } from '@testflow/shared';

interface DomainRow {
  domain: string;
  verification_token: string;
  verified_at: string | null;
  provisioned_at: string | null;
}

/** One DNS record the customer has to publish, rendered as a copyable row. */
function DnsRecord({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <span className="text-muted-foreground">Type</span>
      <span className="font-mono">{type}</span>
      <span className="text-muted-foreground">Name</span>
      <span className="font-mono break-all">{name}</span>
      <span className="text-muted-foreground">Value</span>
      <span className="font-mono break-all">{value}</span>
    </div>
  );
}

export function CustomDomainCard() {
  const { company } = useCompany();
  const { toast } = useToast();
  const hasFeature = useFeatureEntitlement(FEATURES.CUSTOM_DOMAIN);
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: existing, refetch } = useQuery({
    queryKey: ['company-domain', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_domains')
        .select('domain, verification_token, verified_at, provisioned_at')
        .maybeSingle();
      if (error) throw error;
      return (data as DomainRow | null) ?? null;
    },
    enabled: !!company && hasFeature,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('request_custom_domain', { _domain: domain });
      if (error) throw error;
      toast({
        title: 'Domain added',
        description: 'Publish the DNS records below, then contact support to finish activation.',
      });
      setDomain('');
      refetch();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Failed to add domain';
      const message =
        raw.includes('custom_domain_not_in_plan') ? 'Custom domains require the Business plan or higher.'
        : raw.includes('domain_taken') ? 'That domain is already connected to another workspace.'
        : raw;
      toast({ title: 'Could not add domain', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('remove_custom_domain');
      if (error) throw error;
      toast({ title: 'Domain removed' });
      refetch();
    } catch (err) {
      toast({
        title: 'Could not remove domain',
        description: err instanceof Error ? err.message : 'Failed to remove domain',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!hasFeature) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Custom domain
              </CardTitle>
              <CardDescription className="mt-1">
                Serve your workspace from your own domain, e.g. testing.yourcompany.com.
              </CardDescription>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Business plan
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/settings/billing">Upgrade to enable</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom domain</CardTitle>
        <CardDescription>
          Serve your workspace from your own domain instead of {company?.slug}.optimustesting.com.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {existing ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm">{existing.domain}</span>
              {existing.provisioned_at ? (
                <span className="flex items-center gap-1.5 text-xs text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-amber-500">
                  <Clock className="h-3.5 w-3.5" />
                  {existing.verified_at ? 'Awaiting activation' : 'Awaiting DNS'}
                </span>
              )}
            </div>

            {!existing.provisioned_at && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Add both records at your DNS provider. Verification can take up to an hour
                  after the records propagate.
                </p>
                <DnsRecord
                  type="TXT"
                  name={`_testflow-verify.${existing.domain}`}
                  value={existing.verification_token}
                />
                <div className="border-t pt-3">
                  <DnsRecord type="CNAME" name={existing.domain} value="app.optimustesting.com" />
                </div>
              </div>
            )}

            <Button variant="outline" onClick={handleRemove} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove domain
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="custom-domain">Domain</Label>
              <Input
                id="custom-domain"
                value={domain}
                onChange={e => setDomain(e.target.value.toLowerCase().trim())}
                disabled={saving}
                placeholder="testing.yourcompany.com"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter the hostname only — no https:// and no trailing path.
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving || !domain}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add domain
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
