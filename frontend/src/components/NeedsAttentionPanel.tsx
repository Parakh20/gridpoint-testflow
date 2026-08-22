import { AlertTriangle, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

export interface AttentionProject {
  id: string;
  project_number: string;
  site_name: string;
  status: string;
  end_date: string | null;
  assigned_to: string | null;
}

interface NeedsAttentionPanelProps {
  projects: AttentionProject[];
  onSelect: (id: string) => void;
  className?: string;
}

function reasonFor(project: AttentionProject): { label: string; tone: 'danger' | 'warning' } {
  const overdue = !!project.end_date && new Date(project.end_date) < new Date() && project.status !== 'CLOSED';
  if (overdue) return { label: 'Overdue', tone: 'danger' };
  return { label: 'Unassigned', tone: 'warning' };
}

export function NeedsAttentionPanel({ projects, onSelect, className }: NeedsAttentionPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-section-title flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning" />
          Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <EmptyState
            icon={<UserX size={24} />}
            title="You're all caught up"
            description="No overdue or unassigned projects right now."
          />
        ) : (
          <ul className="space-y-1.5">
            {projects.map(project => {
              const reason = reasonFor(project);
              return (
                <li key={project.id}>
                  <button
                    onClick={() => onSelect(project.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left',
                      'hover:border-primary/30 hover:bg-muted/30 transition-colors'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="text-card-title block truncate">{project.project_number}</span>
                      <span className="text-metadata text-muted-foreground block truncate">{project.site_name}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={cn('text-metadata font-semibold', reason.tone === 'danger' ? 'text-destructive' : 'text-warning')}>
                        {reason.label}
                      </span>
                      <StatusBadge status={project.status} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
