import { useRealtimeStatus } from '@/lib/realtime';
import { WifiOff, AlertCircle } from 'lucide-react';

/**
 * Shows a small banner when realtime is unavailable so users know why their
 * data isn't auto-updating. Polling fallback keeps things working — this is
 * just expectation-setting.
 */
export function RealtimeStatusBanner() {
  const status = useRealtimeStatus();

  if (status === 'connected' || status === 'connecting') return null;

  const isDisabled = status === 'disabled';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b ${
        isDisabled
          ? 'bg-muted/60 border-border text-muted-foreground'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
      }`}
      role="status"
    >
      {isDisabled ? <WifiOff className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      <span>
        {isDisabled
          ? 'Live updates disabled — refreshing every 30s.'
          : 'Live updates paused — connection error. Refreshing every 30s instead.'}
      </span>
    </div>
  );
}
