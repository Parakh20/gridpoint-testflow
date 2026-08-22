import { describe, it, expect } from 'vitest';
import { hexToRgb, relativeLuminance, contrastRatio, blendOverBackground } from './colorContrast';

describe('colorContrast utilities', () => {
  it('hexToRgb parses a 6-digit hex color', () => {
    expect(hexToRgb('#60a5fa')).toEqual({ r: 96, g: 165, b: 250 });
  });

  it('relativeLuminance returns 1 for pure white and 0 for pure black', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 4);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 4);
  });

  it('contrastRatio returns 21:1 for black on white (the WCAG maximum)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('contrastRatio returns 1:1 for identical colors', () => {
    expect(contrastRatio('#3b82f6', '#3b82f6')).toBeCloseTo(1, 4);
  });

  it('blendOverBackground composites a translucent foreground over an opaque background', () => {
    // 50% white over black = mid-gray
    expect(blendOverBackground('#ffffff', 0.5, '#000000')).toBe('#808080');
  });
});

describe('StatusBadge assigned-pill contrast (regression guard)', () => {
  // Effective card surface behind a badge, per frontend/src/index.css dark theme
  // (--card: 245 10% 18%, computed to hex once — see this file's header comment
  // for the derivation if it ever needs to be redone after an index.css change).
  const DARK_CARD_HEX = '#2a2933';
  const DARK_SURFACE_ELEVATED_HEX = '#2b3247';

  it('the assigned pill text clears WCAG AA (4.5:1) against the card surface', () => {
    // bg-blue-500/20 + text-blue-300 (STATUS_CONFIG['assigned'] as shipped —
    // see StatusBadge.tsx). The old bg-blue-500/15 + text-blue-400 pairing
    // failed this check, which is the regression this test guards against.
    const effectivePillBg = blendOverBackground('#3b82f6', 0.2, DARK_CARD_HEX);
    const ratio = contrastRatio('#93c5fd', effectivePillBg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('the assigned pill text clears WCAG AA against surface-elevated too (EquipmentUnitCard\'s surface)', () => {
    const effectivePillBg = blendOverBackground('#3b82f6', 0.2, DARK_SURFACE_ELEVATED_HEX);
    const ratio = contrastRatio('#93c5fd', effectivePillBg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
