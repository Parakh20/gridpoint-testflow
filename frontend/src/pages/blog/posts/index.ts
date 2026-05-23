export interface BlogPost {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  content: string; // Markdown
}

export const posts: BlogPost[] = [
  {
    slug: 'complete-substation-commissioning-checklist',
    title: 'The Complete Substation Commissioning Checklist (220 kV → 33 kV)',
    date: '2026-05-23',
    description: 'A practical step-by-step checklist covering every phase: pre-commissioning checks, equipment tests, protection relay verification, and energisation sign-off.',
    content: `
## Phase 1: Pre-Commissioning Checks

Before any instrument is connected, verify the civil and installation baseline:

- **Site readiness:** Transformer plinth level, oil containment pit, fire wall clearances per IS 1886.
- **Cable schedule:** Every MV/LV cable traced against the approved single-line diagram.
- **Earthing continuity:** Earth mat resistance < 1 Ω at transformer neutral, switchgear panels, and cable trays (IS 3043).
- **Control room:** Panel labelling, DC supply voltage and polarity, battery bank capacity test.

## Phase 2: Equipment Tests

Run each piece of equipment in isolation before energising interconnected systems.

### Power Transformers
- Insulation resistance — minimum 1 GΩ at 5 kV for > 33 kV class
- Turns ratio (VRT) — within ±0.5% of nameplate
- Vector group confirmation
- Winding resistance (DC) — phase balance within 2%
- Tan delta / power factor — within manufacturer limits
- Oil BDV — minimum 60 kV at 2.5 mm gap per IS 335
- Buchholz relay, PRD, OTI/WTI calibration

### Current Transformers
- Insulation resistance — PI ratio > 1.25
- Polarity check
- Magnetisation curve (knee-point voltage per IEC 61869-2)
- Ratio error and phase displacement

### SF6 Circuit Breakers
- Gas pressure — typically 6.0–6.5 bar at 20°C
- Timing test: close, open, O-C-O cycle per manufacturer spec
- Contact resistance — typically < 100 µΩ for 132 kV class
- Minimum pickup voltage for trip coil (< 70% rated DC)

### Protection Relays
- Settings verified against approved settings schedule
- Trip circuit supervision functional
- End-to-end protection test with simulated fault injection

## Phase 3: Integrated Tests

- Inter-tripping between feeders and transformer HV/LV breakers
- Auto-reclose sequence (if applicable)
- SCADA telemetry — all status points and metered values live in control centre

## Phase 4: Energisation Sequence

1. Energise transformer from HV side only, LV isolated. Observe for 30 min.
2. HV/LV synchronisation check before paralleling.
3. Load pick-up in stages — 25%, 50%, 75%, 100%.
4. Final power quality: voltage unbalance < 2%, THD < 5% at PCC.

---

*Every phase above maps to test templates built into [Optimus Testing](/).*
    `.trim(),
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug);
}
