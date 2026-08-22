import { StatusBadge } from '@/components/StatusBadge';
import { ProgressBar } from '@/components/ProgressBar';
import { cn } from '@/lib/utils';
import type { EquipmentStatus } from '@/lib/engineerWorkspace';

interface EquipmentUnitCardProps {
  label: string;
  equipmentType: string;
  status: EquipmentStatus;
  completedCount: number;
  totalCount: number;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}

export function EquipmentUnitCard({
  label,
  equipmentType,
  status,
  completedCount,
  totalCount,
  selected,
  onSelect,
  className,
}: EquipmentUnitCardProps) {
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'shrink-0 w-56 rounded-lg border p-3 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border bg-surface-elevated hover:border-primary/30',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-card-title text-foreground truncate">{label}</span>
        <StatusBadge status={status} />
      </div>
      <p className="text-micro-label uppercase text-muted-foreground mt-0.5">
        {equipmentType.replace(/_/g, ' ')}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <ProgressBar value={pct} showPercentage={false} className="flex-1" ariaLabel={`Test completion progress: ${completedCount} of ${totalCount}`} />
        <span className="text-metadata text-muted-foreground shrink-0">
          {completedCount}/{totalCount}
        </span>
      </div>
    </button>
  );
}
