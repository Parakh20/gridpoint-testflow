import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'danger';

interface MetricCardProps {
  label: string;
  value: string | number;
  tone?: Tone;
  icon?: ReactNode;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  className?: string;
}

const TONE_ACCENT: Record<Tone, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

const DIRECTION_CLASS: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-destructive',
  down: 'text-success',
  flat: 'text-muted-foreground',
};

export function MetricCard({ label, value, tone = 'default', icon, delta, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface-elevated p-4 flex items-start justify-between gap-3',
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-micro-label uppercase text-muted-foreground">{label}</p>
        <p className={cn('text-page-title mt-1', TONE_ACCENT[tone])}>{value}</p>
        {delta && (
          <p className={cn('text-metadata mt-1', DIRECTION_CLASS[delta.direction])}>{delta.value}</p>
        )}
      </div>
      {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
    </div>
  );
}
