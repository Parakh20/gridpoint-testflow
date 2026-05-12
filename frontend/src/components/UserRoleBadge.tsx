import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UserRoleBadgeProps {
  role: string;
  className?: string;
}

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-destructive text-destructive-foreground';
      case 'GM':
        return 'bg-primary text-primary-foreground';
      case 'SUPERVISOR':
        return 'bg-secondary text-secondary-foreground';
      case 'ENGINEER':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const displayLabel: Record<string, string> = {
    SUPERADMIN: 'SUPERADMIN',
    GM: 'GM',
    SUPERVISOR: 'MANAGER',
    ENGINEER: 'ENGINEER',
  };

  return (
    <Badge className={cn(getRoleColor(role), className)} variant="secondary">
      {displayLabel[role] ?? role}
    </Badge>
  );
}
