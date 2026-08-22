import { HardDrive } from 'lucide-react';
import type { DraftStatus } from '@/lib/engineerWorkspace';

interface DraftStatusIndicatorProps {
  status: DraftStatus;
}

export function DraftStatusIndicator({ status }: DraftStatusIndicatorProps) {
  if (status !== 'draft') return null;
  return (
    <span className="flex items-center gap-1 text-metadata text-muted-foreground">
      <HardDrive className="h-3 w-3" /> Draft — unsaved
    </span>
  );
}
