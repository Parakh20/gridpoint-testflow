// Colors mirror the web app's dark-theme tokens in frontend/src/index.css
// (the same palette the Platform Admin panel uses). Keep these in lock-step
// when the web theme changes.
export const theme = {
  // hsl(245 9% 15%) — --background
  bg: '#232229',
  // hsl(245 10% 18%) — --card
  card: '#2a2932',
  // hsl(245 10% 22%) — --secondary  (kept for back-compat; was used as cardAlt)
  cardAlt: '#34323c',
  // hsl(245 10% 27%) — --border / --input
  border: '#3f3d49',
  // hsl(245 20% 97%) — --foreground
  text: '#f5f4f8',
  // hsl(245 8% 62%) — --muted-foreground
  textDim: '#989599',
  // hsl(217 91% 60%) — --primary
  primary: '#3b82f6',
  // --primary-foreground
  primaryText: '#ffffff',
  // hsl(5 72% 50%) — --destructive
  danger: '#db392a',
  // hsl(148 55% 40%) — --success
  success: '#2e9e63',
  // hsl(38 85% 52%) — --warning
  warn: '#ec9d2a',
  // hsl(189 94% 43%) — --accent (used for highlights, magic-link CTA, etc.)
  accent: '#06b6d4',
  // hsl(245 10% 24%) — --muted (subtle row backgrounds)
  muted: '#393740',
  // Slight transparency overlay used for backdrop-blur cards on web
  cardSoft: 'rgba(42, 41, 50, 0.6)',
  radius: 12,
  pad: 16,
};

// Tailwind text-{color}-400 / bg-{color}-500/15 equivalents used for role
// pills in the Platform Admin web UI. Mirrored for visual parity.
export const roleBadge = {
  SUPERADMIN: { text: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.30)' },
  GM:         { text: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.30)' },
  SUPERVISOR: { text: '#facc15', bg: 'rgba(234, 179, 8, 0.15)',  border: 'rgba(234, 179, 8, 0.30)' },
  ENGINEER:   { text: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)',  border: 'rgba(34, 197, 94, 0.30)' },
} as const;

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

/**
 * Accessible variant of statusColor() for TEXT specifically. statusColor()
 * itself stays unchanged and in lock-step with web's CSS custom properties
 * (see file header) — it's still correct for borders and status dots, which
 * only need the 3:1 WCAG non-text threshold and clear it at every hue.
 * Badge/label TEXT needs the stricter 4.5:1 threshold; primary/danger/
 * success fail that against theme.bg/theme.card as rendered (hand-verified
 * — see docs/superpowers/plans/2026-08-22-mobile-ux-pattern-parity.md
 * Task 4), so this lightens just those three for text use only.
 */
export const statusTextColor = (s: string) => {
  switch (s) {
    case 'IN_PROGRESS':
      return '#7aabf8';
    case 'REWORK':
      return '#f47b6e';
    case 'APPROVED':
    case 'ACTIVE':
      return '#5fc491';
    default:
      return statusColor(s); // DRAFT/SUBMITTED/CLOSED/unknown already pass at 4.5:1
  }
};
