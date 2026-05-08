import { motion } from 'framer-motion';
import { EquipmentIcon } from './EquipmentIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { ReactNode } from 'react';

const STATUS_ICON_COLOR: Record<string, string> = {
  UNASSIGNED:  '#64748b',
  ASSIGNED:    '#3b82f6',
  IN_PROGRESS: '#06b6d4',
  SUBMITTED:   '#8b5cf6',
  APPROVED:    '#10b981',
  REWORK:      '#ef4444',
};

const STATUS_GLOW: Record<string, string> = {
  ACTIVE:      'dark:shadow-glow-amber',
  REWORK:      'dark:shadow-glow-red',
  APPROVED:    'dark:shadow-glow-green',
  SUBMITTED:   'dark:shadow-glow-purple',
  IN_PROGRESS: 'dark:shadow-glow-blue',
};

interface EquipmentCardProps {
  label: string;
  equipmentType: string;
  status: string;
  footer?: ReactNode;
  onClick?: () => void;
}

export function EquipmentCard({ label, equipmentType, status, footer, onClick }: EquipmentCardProps) {
  const iconColor = STATUS_ICON_COLOR[status.toUpperCase()] ?? '#64748b';
  const glowClass = STATUS_GLOW[status.toUpperCase()] ?? '';

  const friendlyType = equipmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      onClick={onClick}
      className={`
        flex flex-col rounded-xl border border-border bg-card overflow-hidden
        hover:border-primary/40 transition-colors
        ${glowClass}
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Icon area */}
      <div className="flex items-center justify-center py-6 bg-muted/30">
        <EquipmentIcon type={equipmentType} color={iconColor} size={56} />
      </div>

      {/* Info area */}
      <div className="px-4 py-3 space-y-1.5 flex-1">
        <p className="text-sm font-bold text-foreground font-mono tracking-tight">{label}</p>
        <p className="text-xs text-muted-foreground">{friendlyType}</p>
        <StatusBadge status={status} />
      </div>

      {/* Optional footer (e.g. engineer selector) */}
      {footer && (
        <div className="px-4 pb-3 border-t border-border pt-3">
          {footer}
        </div>
      )}
    </motion.div>
  );
}
