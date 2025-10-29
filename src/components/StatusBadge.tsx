import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase().replace('_', '');
    
    switch (statusLower) {
      case 'unassigned':
        return 'bg-status-unassigned text-white';
      case 'assigned':
        return 'bg-status-assigned text-white';
      case 'inprogress':
      case 'in_progress':
        return 'bg-status-inProgress text-white';
      case 'submitted':
        return 'bg-status-submitted text-white';
      case 'approved':
        return 'bg-status-approved text-white';
      case 'rework':
        return 'bg-status-rework text-white';
      case 'draft':
        return 'bg-muted text-muted-foreground';
      case 'active':
        return 'bg-success text-success-foreground';
      case 'closed':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Badge className={cn(getStatusColor(status), className)} variant="secondary">
      {formatStatus(status)}
    </Badge>
  );
}
