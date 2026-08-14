import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'danger';

interface ProgressBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  tone?: Tone;
  className?: string;
}

const TONE_INDICATOR: Record<Tone, string> = {
  default: '[&>div]:bg-primary',
  success: '[&>div]:bg-success',
  warning: '[&>div]:bg-warning',
  danger: '[&>div]:bg-destructive',
};

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  tone = 'default',
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-metadata text-muted-foreground">
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(clamped)}%</span>}
        </div>
      )}
      <Progress value={clamped} className={TONE_INDICATOR[tone]} />
    </div>
  );
}
