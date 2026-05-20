export const theme = {
  bg: '#0f172a',
  card: '#1e293b',
  cardAlt: '#334155',
  border: '#334155',
  text: '#f1f5f9',
  textDim: '#94a3b8',
  primary: '#38bdf8',
  primaryText: '#0f172a',
  danger: '#ef4444',
  success: '#22c55e',
  warn: '#f59e0b',
  radius: 12,
  pad: 16,
};

export const statusColor = (s: string) => {
  switch (s) {
    case 'DRAFT':
      return theme.textDim;
    case 'IN_PROGRESS':
      return theme.primary;
    case 'SUBMITTED':
      return theme.warn;
    case 'APPROVED':
    case 'ACTIVE':
      return theme.success;
    case 'REWORK':
      return theme.danger;
    case 'CLOSED':
      return theme.textDim;
    default:
      return theme.textDim;
  }
};
