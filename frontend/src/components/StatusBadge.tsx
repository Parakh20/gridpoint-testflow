import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { pill: string; dot: string }> = {
  unassigned:  { pill: 'bg-slate-500/15 text-slate-400 border-slate-500/25',   dot: '#94a3b8' },
  assigned:    { pill: 'bg-blue-500/15 text-blue-400 border-blue-500/25',       dot: '#60a5fa' },
  in_progress: { pill: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',       dot: '#22d3ee' },
  inprogress:  { pill: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',       dot: '#22d3ee' },
  submitted:   { pill: 'bg-violet-500/15 text-violet-400 border-violet-500/25', dot: '#a78bfa' },
  approved:    { pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: '#34d399' },
  rework:      { pill: 'bg-red-500/15 text-red-400 border-red-500/25',          dot: '#f87171' },
  draft:       { pill: 'bg-slate-500/15 text-slate-400 border-slate-500/25',   dot: '#94a3b8' },
  active:      { pill: 'bg-amber-500/15 text-amber-400 border-amber-500/25',    dot: '#fbbf24' },
  closed:      { pill: 'bg-slate-400/10 text-slate-400 border-slate-500/20',   dot: '#94a3b8' },
  aclosed:     { pill: 'bg-slate-400/10 text-slate-400 border-slate-500/20',   dot: '#94a3b8' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/ /g, '_');
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG['draft'];

  const formatted = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        'font-mono text-[10px] uppercase tracking-[0.04em] font-semibold',
        config.pill,
        className
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: config.dot, boxShadow: `0 0 6px ${config.dot}` }}
      />
      {formatted}
    </span>
  );
}
