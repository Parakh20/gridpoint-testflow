-- =============================================================================
-- Migration: SFRA Test for Power Transformer
-- Description: Adds Sweep Frequency Resonance Analysis (SFRA) as test PT-007
--              for Power Transformer equipment type.
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES (
  'POWER_TRANSFORMER',
  'PT-007',
  'Sweep Frequency Resonance Analysis (SFRA) Test',
  'PARAMETERS',
  '[]'::JSONB,
  TRUE
);
