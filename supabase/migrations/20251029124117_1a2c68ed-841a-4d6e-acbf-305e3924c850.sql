-- Add SFRA test to Power Transformer
INSERT INTO test_templates (equipment_type, test_name, test_code, tab, fields, is_active)
VALUES (
  'POWER_TRANSFORMER',
  'Sweep Frequency Resonance Analysis (SFRA) Test',
  'PT-007',
  'PARAMETERS',
  '[]'::jsonb,
  true
);