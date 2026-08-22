import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface ReviewQueueItemProps {
  testName: string;
  testCode: string;
  equipmentLabel: string;
  equipmentType: string;
  projectNumber: string;
  selected: boolean;
  reviewing: boolean;
  onToggleSelect: () => void;
  onOpenProject: () => void;
  onRework: () => void;
  onApprove: () => void;
}

export function ReviewQueueItem({
  testName,
  testCode,
  equipmentLabel,
  equipmentType,
  projectNumber,
  selected,
  reviewing,
  onToggleSelect,
  onOpenProject,
  onRework,
  onApprove,
}: ReviewQueueItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`Select test ${testCode}`} />
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-card-title text-foreground">{testName}</span>
            <span className="text-metadata font-mono text-muted-foreground">{testCode}</span>
          </div>
          <div className="flex items-center gap-2 text-metadata text-muted-foreground">
            <span>{equipmentLabel}</span>
            <span>·</span>
            <span>{equipmentType.replace(/_/g, ' ')}</span>
            <span>·</span>
            <button className="text-primary underline-offset-2 hover:underline" onClick={onOpenProject}>
              {projectNumber}
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" disabled={reviewing} onClick={onRework}>
          {reviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
          Rework
        </Button>
        <Button size="sm" disabled={reviewing} onClick={onApprove}>
          {reviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
          Approve
        </Button>
      </div>
    </div>
  );
}
