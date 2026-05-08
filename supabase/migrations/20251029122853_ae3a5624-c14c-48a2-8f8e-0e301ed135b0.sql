-- =============================================================================
-- Migration: Full Test Template Seed (All Equipment Types)
-- Description: Replaces the initial Power Transformer seed with the complete
--              set of test templates across all 8 equipment types (45 tests).
--
--   Equipment types and test counts:
--     POWER_TRANSFORMER  — 12 tests  (PT_VRT … PT_IR)
--     CT                 —  6 tests  (CT_ANALYZER … CT_IR)
--     CVT                —  6 tests  (CVT_VRT … CVT_IR)
--     LA                 —  4 tests  (LA_SCT … LA_IR)
--     SF6_BREAKER        —  7 tests  (SF6_TM … SF6_IRC)
--     ISOLATOR           —  3 tests  (ISO_CRI … ISO_IR)
--     VCB                —  6 tests  (VCB_TM … VCB_IRC)
--     EARTH_PIT          —  1 test   (EP_EPM)
-- =============================================================================


-- Remove initial seed from migration 20251029064345
DELETE FROM test_templates;


-- =============================================================================
-- POWER TRANSFORMER (12 tests)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
  ('POWER_TRANSFORMER', 'PT_VRT',  'Voltage Ratio Test',                                           'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_HVMC', 'HV Magnetizing Current Test',                                  'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_LVMC', 'LV Magnetizing Current Test',                                  'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_MBHV', 'Magnetic Balance Test – HV Side',                              'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_MBLV', 'Magnetic Balance Test – LV Side',                              'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_WRHV', 'Transformer Winding Resistance Measurement – HV Winding',      'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_WRLV', 'Transformer Winding Resistance Measurement – LV Winding',      'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_TRT',  'Transformer Turns Ratio Test',                                  'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_TDHV', 'Tan Delta and Capacitance Measurement of HV Bushings',          'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_TDLV', 'Tan Delta and Capacitance Measurement of LV Bushings',          'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_TDW',  'Tan Delta and Capacitance Measurement of Windings',             'PARAMETERS', '[]', TRUE),
  ('POWER_TRANSFORMER', 'PT_IR',   'Insulation Resistance Measurement',                             'PARAMETERS', '[]', TRUE);


-- =============================================================================
-- CURRENT TRANSFORMER (6 tests)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
  ('CT', 'CT_ANALYZER', 'CT Analyzer Testing',                              'PARAMETERS', '[]', TRUE),
  ('CT', 'CT_WRM',      'Winding Resistance Measurement',                   'PARAMETERS', '[]', TRUE),
  ('CT', 'CT_POL',      'Polarity Check',                                   'PARAMETERS', '[]', TRUE),
  ('CT', 'CT_CRI',      'Current Ratio by Primary Injection',               'PARAMETERS', '[]', TRUE),
  ('CT', 'CT_TD',       'Tan Delta and Capacitance Measurement of Windings', 'PARAMETERS', '[]', TRUE),
  ('CT', 'CT_IR',       'Insulation Resistance Measurement',                 'PARAMETERS', '[]', TRUE);


-- =============================================================================
-- CAPACITIVE/VOLTAGE TRANSFORMER (6 tests)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
  ('CVT', 'CVT_VRT', 'Voltage Ratio Test',                                   'PARAMETERS', '[]', TRUE),
  ('CVT', 'CVT_POL', 'Polarity Check',                                       'PARAMETERS', '[]', TRUE),
  ('CVT', 'CVT_SWR', 'Secondary Winding Resistance Measurement',             'PARAMETERS', '[]', TRUE),
  ('CVT', 'CVT_CON', 'Continuity of Winding',                                'PARAMETERS', '[]', TRUE),
  ('CVT', 'CVT_TD',  'Tan Delta and Capacitance Measurement of Windings',    'PARAMETERS', '[]', TRUE),
  ('CVT', 'CVT_IR',  'Insulation Resistance Measurement',                    'PARAMETERS', '[]', TRUE);


-- =============================================================================
-- LIGHTNING / SURGE ARRESTOR (4 tests)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
  ('LA', 'LA_SCT',  'Surge Counter Test',                              'PARAMETERS', '[]', TRUE),
  ('LA', 'LA_THRC', 'Third Harmonic Resistive Current Measurement',    'PARAMETERS', '[]', TRUE),
  ('LA', 'LA_TD',   'Tan Delta and Capacitance Measurement of Windings','PARAMETERS', '[]', TRUE),
  ('LA', 'LA_IR',   'Insulation Resistance Measurement',               'PARAMETERS', '[]', TRUE);


-- =============================================================================
-- SF6 CIRCUIT BREAKER (7 tests)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
  ('SF6_BREAKER', 'SF6_TM',  'Timing Measurement',                                    'PARAMETERS', '[]', TRUE),
  ('SF6_BREAKER', 'SF6_CR',  'Contact Resistance Measurement',                        'PARAMETERS', '[]', TRUE),
  ('SF6_BREAKER', 'SF6_CC',  'Coil Characteristics Measurement',                      'PARAMETERS', '[]', TRUE),
  ('SF6_BREAKER', 'SF6_DCR', 'Dynamic Contact Resistance Measurement',                'PARAMETERS', '[]', TRUE),
  ('SF6_BREAKER', 'SF6_DP',  'Dew Point of SF6 Measurement',                         'PARAMETERS', '[]', TRUE),
  ('SF6_BREAKER', 'SF6_IRO', 'Insulation Resistance Measurement – Open Condition',    'PARAMETERS', '[]', TRUE),
  ('SF6_BREAKER', 'SF6_IRC', 'Insulation Resistance Measurement – Close Condition',   'PARAMETERS', '[]', TRUE);


-- =============================================================================
-- ISOLATOR (3 tests)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
  ('ISOLATOR', 'ISO_CRI', 'Contact Resistance Measurement of Isolator Contacts',     'PARAMETERS', '[]', TRUE),
  ('ISOLATOR', 'ISO_CRE', 'Contact Resistance Measurement of Earth Switch Contacts', 'PARAMETERS', '[]', TRUE),
  ('ISOLATOR', 'ISO_IR',  'Insulation Resistance Measurement – Open Condition',      'PARAMETERS', '[]', TRUE);


-- =============================================================================
-- VACUUM CIRCUIT BREAKER (6 tests)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
  ('VCB', 'VCB_TM',  'Timing Measurement',                                   'PARAMETERS', '[]', TRUE),
  ('VCB', 'VCB_CR',  'Contact Resistance Measurement',                       'PARAMETERS', '[]', TRUE),
  ('VCB', 'VCB_CON', 'Continuity Test',                                      'PARAMETERS', '[]', TRUE),
  ('VCB', 'VCB_HV',  'HV Test',                                              'PARAMETERS', '[]', TRUE),
  ('VCB', 'VCB_IRO', 'Insulation Resistance Measurement – Open Condition',   'PARAMETERS', '[]', TRUE),
  ('VCB', 'VCB_IRC', 'Insulation Resistance Measurement – Close Condition',  'PARAMETERS', '[]', TRUE);


-- =============================================================================
-- EARTH PIT (1 test)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
  ('EARTH_PIT', 'EP_EPM', 'Earth Pit Measurement', 'PARAMETERS', '[]', TRUE);
