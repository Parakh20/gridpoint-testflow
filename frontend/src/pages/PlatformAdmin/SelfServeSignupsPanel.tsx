import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { platformFetch } from './platformFetch';
import { Lead, STAGE_LABEL, LeadStage } from './leadTypes';

/**
 * Companies that exist with no lead behind them.
 *
 * Self-serve `/start-trial` means a tenant can now appear without sales ever
 * touching it, so the lead pipeline no longer accounts for every customer.
 * These are deliberately NOT auto-created as leads: a signup is a customer, not
 * a prospect, and injecting it into an outreach pipeline would corrupt the
 * "who have we actually contacted" record that the contact book depends on.
 *
 * Where a company's name matches an existing lead, that lead is offered as a
 * suggestion — sales probably did work it and just never linked the row. Names
 * collide, so linking stays a human decision.
 */

interface UnlinkedCompany {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  trial_ends_at: string | null;
  suggested_lead_id: string | null;
  suggested_lead_stage: LeadStage | null;
}

export function SelfServeSignupsPanel({
  leads,
  onLinked,
}: {
  leads: Lead[];
  onLinked: () => void;
}) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<UnlinkedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [chosenLead, setChosenLead] = useState<Record<string, string>>({});

  const fetchUnlinked = async () => {
    setLoading(true);
    try {
      const data = await platformFetch('get_selfserve_signups');
      setCompanies((data.companies ?? []) as UnlinkedCompany[]);
    } catch (err: any) {
      console.error('[Sales] get_selfserve_signups error:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to load self-serve signups',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnlinked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLink = async (company: UnlinkedCompany) => {
    const leadId = chosenLead[company.id] ?? company.suggested_lead_id;
    if (!leadId) return;
    setLinkingId(company.id);
    try {
      await platformFetch('link_company_to_lead', {
        lead_id: leadId,
        company_id: company.id,
        stage: 'WON',
      });
      setCompanies(prev => prev.filter(c => c.id !== company.id));
      toast({ title: 'Linked to lead', description: `${company.name} → WON` });
      onLinked();
    } catch (err: any) {
      console.error('[Sales] link_company_to_lead error:', err);
      toast({ variant: 'destructive', title: 'Failed to link', description: err.message });
    } finally {
      setLinkingId(null);
    }
  };

  // Leads that could plausibly be the origin of a signup — anything not already
  // tied to a company.
  const linkableLeads = useMemo(
    () => leads.filter(l => !l.company_id).sort((a, b) => a.company_name.localeCompare(b.company_name)),
    [leads],
  );

  const suggestedCount = companies.filter(c => c.suggested_lead_id).length;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  if (companies.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Self-serve signups
          <Badge variant="secondary" className="font-mono">{companies.length}</Badge>
          {suggestedCount > 0 && (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {suggestedCount} may match a lead
            </Badge>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          Signed up without sales — not counted in the pipeline above
        </span>
      </button>

      {open && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Signed up</TableHead>
              <TableHead>Trial ends</TableHead>
              <TableHead>Link to a lead</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map(c => {
              const selected = chosenLead[c.id] ?? c.suggested_lead_id ?? '';
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{c.slug}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.trial_ends_at ? formatDate(c.trial_ends_at) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selected}
                        onValueChange={v => setChosenLead(prev => ({ ...prev, [c.id]: v }))}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="No lead — pure self-serve" />
                        </SelectTrigger>
                        <SelectContent>
                          {linkableLeads.map(l => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.company_name}
                              {l.stage !== 'NEW' && ` · ${STAGE_LABEL[l.stage]}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!selected || linkingId === c.id}
                        onClick={() => handleLink(c)}
                      >
                        {linkingId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                        Link as won
                      </Button>
                    </div>
                    {c.suggested_lead_id && !chosenLead[c.id] && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Name matches a lead
                        {c.suggested_lead_stage && ` at ${STAGE_LABEL[c.suggested_lead_stage]}`} — confirm before linking.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
