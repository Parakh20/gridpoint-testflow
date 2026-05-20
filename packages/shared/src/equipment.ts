/**
 * Canonical equipment type → short label mapping.
 * Used for instance IDs like `PTR-001`, `CT-007`, etc.
 *
 * When you add a new equipment type:
 *  1. Add to the `equipment_type` enum in a Supabase migration.
 *  2. Regenerate types: `supabase gen types typescript --project-id ... > frontend/src/integrations/supabase/types.ts`
 *  3. Add the label here. Both web and mobile read this single source.
 */

export type EquipmentType =
  | 'POWER_TRANSFORMER'
  | 'CT'
  | 'CVT'
  | 'LA'
  | 'SF6_BREAKER'
  | 'ISOLATOR'
  | 'VCB'
  | 'EARTH_PIT'
  | 'VT';

export const EQUIPMENT_LABEL: Record<EquipmentType, string> = {
  POWER_TRANSFORMER: 'PTR',
  CT: 'CT',
  CVT: 'CVT',
  LA: 'LA',
  SF6_BREAKER: 'SF6',
  ISOLATOR: 'ISO',
  VCB: 'VCB',
  EARTH_PIT: 'EP',
  VT: 'VT',
};

/** Lookup with a fallback to the raw type for forward compatibility. */
export function labelForEquipment(eq: string | null | undefined): string {
  if (!eq) return 'UNK';
  return (EQUIPMENT_LABEL as Record<string, string>)[eq] ?? eq;
}
