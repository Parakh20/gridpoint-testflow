import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; darkGlow?: string }> = {
  // Equipment / task statuses
  unassigned:  { bg: 'bg-slate-500/20 border border-slate-500/30', text: 'text-slate-400' },
  assigned:    { bg: 'bg-blue-500/20 border border-blue-500/30',   text: 'text-blue-400' },
  in_progress: { bg: 'bg-cyan-500/20 border border-cyan-500/30',   text: 'text-cyan-400' },
  inprogress:  { bg: 'bg-cyan-500/20 border border-cyan-500/30',   text: 'text-cyan-400' },
  submitted:   { bg: 'bg-violet-500/20 border border-violet-500/30', text: 'text-violet-400', darkGlow: 'dark:shadow-glow-purple dark:animate-glow-blue' },
  approved:    { bg: 'bg-emerald-500/20 border border-emerald-500/30', text: 'text-emerald-400', darkGlow: 'dark:shadow-glow-green' },
  rework:      { bg: 'bg-red-500/20 border border-red-500/30',     text: 'text-red-400',     darkGlow: 'dark:animate-glow-pulse-red' },
  // Project statuses
  draft:       { bg: 'bg-slate-500/20 border border-slate-500/30', text: 'text-slate-400' },
  active:      { bg: 'bg-amber-500/20 border border-amber-500/30', text: 'text-amber-400',  darkGlow: 'dark:animate-glow-pulse-amber' },
  closed:      { bg: 'bg-slate-400/15 border border-slate-500/20', text: 'text-slate-400' },
  // Project approval
  aclosed:     { bg: 'bg-slate-400/15 border border-slate-500/20', text: 'text-slate-400' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/ /g, '_');
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG['draft'];

  const formatted = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Badge
      variant="secondary"
      className={cn(
        'text-[11px] font-semibold px-2 py-0.5 rounded-md border-0',
        config.bg,
        config.text,
        config.darkGlow,
        className
      )}
    >
      {formatted}
    </Badge>
  );
}
