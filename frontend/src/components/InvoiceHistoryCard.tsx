import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/format';
import { captureException } from '@/lib/monitoring';

interface Invoice {
  providerInvoiceId: string;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string | null;
  paidAt: string | null;
  shortUrl: string | null;
}

const PAID_STATUSES = new Set(['paid']);
const FAILED_STATUSES = new Set(['expired', 'cancelled']);

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (PAID_STATUSES.has(status)) return 'default';
  if (FAILED_STATUSES.has(status)) return 'destructive';
  return 'secondary';
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Intl throws on an unrecognised currency code from the provider.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function InvoiceHistoryCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'invoices' },
      });
      if (error) throw error;
      return (data?.invoices ?? []) as Invoice[];
    },
    // Invoices only change when a billing cycle closes — no need to refetch
    // on every remount of the billing page.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (error) captureException(error, { where: 'InvoiceHistoryCard' }, 'payment_failure');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>Your billing history. Receipts open on Razorpay.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!isLoading && error && (
          <p className="text-sm text-muted-foreground">
            Could not load your invoices right now. Try again in a moment.
          </p>
        )}

        {!isLoading && !error && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            No invoices yet. Your first invoice appears after your first payment.
          </p>
        )}

        {!isLoading && !error && (data ?? []).length > 0 && (
          <ul className="divide-y">
            {(data ?? []).map(invoice => (
              <li
                key={invoice.providerInvoiceId}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {invoice.invoiceNumber ?? invoice.providerInvoiceId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.issuedAt ? formatDate(invoice.issuedAt) : 'Not issued yet'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium tabular-nums">
                    {formatAmount(invoice.amount, invoice.currency)}
                  </span>
                  <Badge variant={statusVariant(invoice.status)} className="capitalize">
                    {invoice.status}
                  </Badge>
                  {invoice.shortUrl && (
                    <a
                      href={invoice.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Open invoice ${invoice.invoiceNumber ?? invoice.providerInvoiceId}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
