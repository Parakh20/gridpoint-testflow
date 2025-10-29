-- Delete existing test templates to start fresh
DELETE FROM test_templates;

-- Power Transformer Tests (12 tests)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
('POWER_TRANSFORMER', 'PT_VRT', 'Voltage Ratio Test', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_HVMC', 'HV Magnetizing Current Test', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_LVMC', 'LV Magnetizing Current Test', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_MBHV', 'Magnetic Balance Test – HV Side', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_MBLV', 'Magnetic Balance Test – LV Side', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_WRHV', 'Transformer Winding Resistance Measurement – HV Winding', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_WRLV', 'Transformer Winding Resistance Measurement – LV Winding', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_TRT', 'Transformer Turns Ratio Test', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_TDHV', 'Tan Delta and Capacitance Measurement of HV Bushings', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_TDLV', 'Tan Delta and Capacitance Measurement of LV Bushings', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_TDW', 'Tan Delta and Capacitance Measurement of Windings', 'PARAMETERS', '[]', true),
('POWER_TRANSFORMER', 'PT_IR', 'Insulation Resistance Measurement', 'PARAMETERS', '[]', true);

-- Current Transformer Tests (6 tests)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
('CT', 'CT_ANALYZER', 'CT Analyzer Testing', 'PARAMETERS', '[]', true),
('CT', 'CT_WRM', 'Winding Resistance Measurement', 'PARAMETERS', '[]', true),
('CT', 'CT_POL', 'Polarity Check', 'PARAMETERS', '[]', true),
('CT', 'CT_CRI', 'Current Ratio by Primary Injection', 'PARAMETERS', '[]', true),
('CT', 'CT_TD', 'Tan Delta and Capacitance Measurement of Windings', 'PARAMETERS', '[]', true),
('CT', 'CT_IR', 'Insulation Resistance Measurement', 'PARAMETERS', '[]', true);

-- Capacitive/Voltage Transformer Tests (6 tests)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
('CVT', 'CVT_VRT', 'Voltage Ratio Test', 'PARAMETERS', '[]', true),
('CVT', 'CVT_POL', 'Polarity Check', 'PARAMETERS', '[]', true),
('CVT', 'CVT_SWR', 'Secondary Winding Resistance Measurement', 'PARAMETERS', '[]', true),
('CVT', 'CVT_CON', 'Continuity of Winding', 'PARAMETERS', '[]', true),
('CVT', 'CVT_TD', 'Tan Delta and Capacitance Measurement of Windings', 'PARAMETERS', '[]', true),
('CVT', 'CVT_IR', 'Insulation Resistance Measurement', 'PARAMETERS', '[]', true);

-- Lightning/Surge Arrestor Tests (4 tests)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
('LA', 'LA_SCT', 'Surge Counter Test', 'PARAMETERS', '[]', true),
('LA', 'LA_THRC', 'Third Harmonic Resistive Current Measurement', 'PARAMETERS', '[]', true),
('LA', 'LA_TD', 'Tan Delta and Capacitance Measurement of Windings', 'PARAMETERS', '[]', true),
('LA', 'LA_IR', 'Insulation Resistance Measurement', 'PARAMETERS', '[]', true);

-- SF6 Breaker Tests (7 tests)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
('SF6_BREAKER', 'SF6_TM', 'Timing Measurement', 'PARAMETERS', '[]', true),
('SF6_BREAKER', 'SF6_CR', 'Contact Resistance Measurement', 'PARAMETERS', '[]', true),
('SF6_BREAKER', 'SF6_CC', 'Coil Characteristics Measurement', 'PARAMETERS', '[]', true),
('SF6_BREAKER', 'SF6_DCR', 'Dynamic Contact Resistance Measurement', 'PARAMETERS', '[]', true),
('SF6_BREAKER', 'SF6_DP', 'Dew Point of SF6 Measurement', 'PARAMETERS', '[]', true),
('SF6_BREAKER', 'SF6_IRO', 'Insulation Resistance Measurement – Open Condition', 'PARAMETERS', '[]', true),
('SF6_BREAKER', 'SF6_IRC', 'Insulation Resistance Measurement – Close Condition', 'PARAMETERS', '[]', true);

-- Isolator Tests (3 tests)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
('ISOLATOR', 'ISO_CRI', 'Contact Resistance Measurement of Isolator Contacts', 'PARAMETERS', '[]', true),
('ISOLATOR', 'ISO_CRE', 'Contact Resistance Measurement of Earth Switch Contacts', 'PARAMETERS', '[]', true),
('ISOLATOR', 'ISO_IR', 'Insulation Resistance Measurement – Open Condition', 'PARAMETERS', '[]', true);

-- Vacuum Circuit Breaker Tests (6 tests)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
('VCB', 'VCB_TM', 'Timing Measurement', 'PARAMETERS', '[]', true),
('VCB', 'VCB_CR', 'Contact Resistance Measurement', 'PARAMETERS', '[]', true),
('VCB', 'VCB_CON', 'Continuity Test', 'PARAMETERS', '[]', true),
('VCB', 'VCB_HV', 'HV Test', 'PARAMETERS', '[]', true),
('VCB', 'VCB_IRO', 'Insulation Resistance Measurement – Open Condition', 'PARAMETERS', '[]', true),
('VCB', 'VCB_IRC', 'Insulation Resistance Measurement – Close Condition', 'PARAMETERS', '[]', true);

-- Earth Pit Test (1 test)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active) VALUES
('EARTH_PIT', 'EP_EPM', 'Earth Pit Measurement', 'PARAMETERS', '[]', true);