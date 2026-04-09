/**
 * IEEE-style schematic SVG symbols for each equipment type.
 * All icons are 64×64 viewport, stroke-based, no fill (except ground symbol).
 */

interface IconProps {
  color?: string;
  size?: number;
}

export type EquipmentType =
  | 'POWER_TRANSFORMER'
  | 'CT'
  | 'CVT'
  | 'LA'
  | 'SF6_BREAKER'
  | 'ISOLATOR'
  | 'VCB'
  | 'EARTH_PIT';

/* ─── Individual SVG Symbols ─── */

function PowerTransformerIcon({ color = 'currentColor', size = 64 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* HV winding — top circle */}
      <circle cx="32" cy="22" r="12" stroke={color} strokeWidth="2" />
      {/* LV winding — bottom circle (overlapping) */}
      <circle cx="32" cy="42" r="12" stroke={color} strokeWidth="2" />
      {/* HV terminal lines */}
      <line x1="32" y1="4" x2="32" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* LV terminal lines */}
      <line x1="32" y1="54" x2="32" y2="60" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Core line between windings */}
      <line x1="20" y1="32" x2="44" y2="32" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  );
}

function CTIcon({ color = 'currentColor', size = 64 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Toroidal core circle */}
      <circle cx="32" cy="32" r="16" stroke={color} strokeWidth="2" />
      {/* Primary conductor — through line */}
      <line x1="8" y1="32" x2="56" y2="32" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Secondary terminal lines — top */}
      <line x1="32" y1="16" x2="32" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Secondary terminal dot */}
      <circle cx="32" cy="8" r="2" fill={color} />
    </svg>
  );
}

function CVTIcon({ color = 'currentColor', size = 64 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Capacitor stack — 3 plates */}
      <line x1="20" y1="16" x2="44" y2="16" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="22" x2="44" y2="22" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="28" x2="40" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="34" x2="40" y2="34" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Voltage transformer circle below */}
      <circle cx="32" cy="50" r="10" stroke={color} strokeWidth="2" />
      {/* Connecting line cap → VT */}
      <line x1="32" y1="34" x2="32" y2="40" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Top terminal */}
      <line x1="32" y1="4" x2="32" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LAIcon({ color = 'currentColor', size = 64 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Zigzag lightning bolt downward */}
      <polyline
        points="32,6 24,24 36,24 22,46"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ground symbol */}
      <line x1="22" y1="46" x2="42" y2="46" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="51" x2="38" y2="51" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="56" x2="34" y2="56" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Top terminal */}
      <circle cx="32" cy="6" r="2.5" fill={color} />
    </svg>
  );
}

function SF6BreakerIcon({ color = 'currentColor', size = 64 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Breaker body rectangle */}
      <rect x="16" y="20" width="32" height="24" rx="3" stroke={color} strokeWidth="2" />
      {/* Open contact gap indicator (X shape inside) */}
      <line x1="24" y1="28" x2="40" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="28" x2="24" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Top terminal */}
      <line x1="32" y1="6" x2="32" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Bottom terminal */}
      <line x1="32" y1="44" x2="32" y2="58" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IsolatorIcon({ color = 'currentColor', size = 64 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Left terminal */}
      <circle cx="14" cy="32" r="4" stroke={color} strokeWidth="2" />
      <line x1="6" y1="32" x2="10" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Right terminal */}
      <circle cx="50" cy="32" r="4" stroke={color} strokeWidth="2" />
      <line x1="54" y1="32" x2="58" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Open blade — angled line showing isolation */}
      <line x1="18" y1="32" x2="44" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Insulator post */}
      <line x1="32" y1="42" x2="32" y2="54" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="54" x2="38" y2="54" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function VCBIcon({ color = 'currentColor', size = 64 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Vacuum interrupter outer circle */}
      <circle cx="32" cy="32" r="18" stroke={color} strokeWidth="2" />
      {/* Inner contact pair */}
      <line x1="32" y1="20" x2="32" y2="27" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="37" x2="32" y2="44" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Gap between contacts */}
      <line x1="28" y1="27" x2="36" y2="27" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="37" x2="36" y2="37" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Top/bottom terminals */}
      <line x1="32" y1="6" x2="32" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="50" x2="32" y2="58" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EarthPitIcon({ color = 'currentColor', size = 64 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Electrode rod driving down */}
      <line x1="32" y1="8" x2="32" y2="44" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Ground lines — IEEE symbol */}
      <line x1="18" y1="44" x2="46" y2="44" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="22" y1="50" x2="42" y2="50" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="27" y1="56" x2="37" y2="56" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Earth/soil hatch */}
      <line x1="14" y1="48" x2="18" y2="44" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="22" y1="48" x2="26" y2="44" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="30" y1="48" x2="34" y2="44" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="38" y1="48" x2="42" y2="44" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <line x1="46" y1="48" x2="50" y2="44" stroke={color} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Registry ─── */

const ICON_MAP: Record<EquipmentType, (props: IconProps) => JSX.Element> = {
  POWER_TRANSFORMER: PowerTransformerIcon,
  CT:               CTIcon,
  CVT:              CVTIcon,
  LA:               LAIcon,
  SF6_BREAKER:      SF6BreakerIcon,
  ISOLATOR:         IsolatorIcon,
  VCB:              VCBIcon,
  EARTH_PIT:        EarthPitIcon,
};

interface EquipmentIconProps {
  type: string;
  color?: string;
  size?: number;
}

export function EquipmentIcon({ type, color, size }: EquipmentIconProps) {
  const Icon = ICON_MAP[type as EquipmentType];
  if (!Icon) return null;
  return <Icon color={color} size={size} />;
}
