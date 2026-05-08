-- =============================================================================
-- Migration: Add VT (Voltage Transformer) equipment type and templates.
--
-- VT has the same test structure as LA (Lightning Arrestor) per the
-- Switchyard Testing Platform PDF forms.
--
-- Templates added:
--   VT_NP  : Nameplate + Phase Details + Site Testing Details
--   VT_IR  : Insulation Resistance Measurement at 5000 V
--   VT_SCR : Surge Counter Reading
--   VT_THR : Third Harmonic Resistive Current Measurement
--   VT_TD  : Tan Delta and Capacitance Measurement
-- =============================================================================

-- Add VT to the equipment_type enum.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction; Supabase migrations
-- run each file in its own session so this is safe.
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'VT';


-- =============================================================================
-- VT — Voltage Transformer
-- =============================================================================

-- VT_NP: Nameplate + Phase Details + Site Testing Details
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VT', 'VT_NP', 'Voltage Transformer Nameplate & Site Testing Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "common",
      "title": "Section 1: Common Equipment Details (Same for All Phases)",
      "type": "fields",
      "fields": [
        {"key": "feeder_bay_name",    "title": "Feeder / Bay Name",      "type": "string", "required": true},
        {"key": "voltage_rating_kv",  "title": "Voltage Rating (kV)",    "type": "string"},
        {"key": "system_voltage_kv",  "title": "System Voltage (kV)",    "type": "string"},
        {"key": "rated_frequency_hz", "title": "Rated Frequency (Hz)",   "type": "number", "default": 50}
      ]
    },
    {
      "id": "phase_details",
      "title": "Section 2: Phase-wise Details",
      "type": "phase_columns",
      "phases": ["R", "Y", "B"],
      "fields": [
        {"key": "serial_number",       "title": "Serial Number",       "type": "string", "required": true},
        {"key": "manufacturer",        "title": "Manufacturer",        "type": "string"},
        {"key": "year_of_manufacture", "title": "Year of Manufacture", "type": "string"},
        {"key": "type_model",          "title": "Type / Model",        "type": "string"}
      ]
    },
    {
      "id": "site",
      "title": "Section 3: Site Testing Details",
      "type": "fields",
      "fields": [
        {"key": "date_site_reporting", "title": "Date of Site Reporting", "type": "date"},
        {"key": "date_testing",        "title": "Date of Testing",        "type": "date", "required": true},
        {"key": "ambient_temp",        "title": "Ambient Temperature (°C)","type": "number", "required": true},
        {"key": "testing_done_by",     "title": "Testing Done By",        "type": "string", "required": true},
        {"key": "test_witnessed_by",   "title": "Test Witnessed By",      "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- VT_IR: Insulation Resistance at 5000 V (up to 6 stacks per phase)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VT', 'VT_IR', 'Insulation Resistance Measurement at 5000 V', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "vt_ir",
      "title": "Insulation Resistance Measurement at 5000 Volts",
      "note": "Stack size / formula required (example: 1, 2, 4). Fill rows for stacks present on this VT unit.",
      "type": "ir_fixed_phase",
      "phases": ["R", "Y", "B"],
      "rows": [
        {"id": "s1", "sr": "1", "insulation": "1st Stack & Earth", "voltage": "5 kV", "unit": "MΩ"},
        {"id": "s2", "sr": "2", "insulation": "2nd Stack & Earth", "voltage": "5 kV", "unit": "MΩ"},
        {"id": "s3", "sr": "3", "insulation": "3rd Stack & Earth", "voltage": "5 kV", "unit": "MΩ"},
        {"id": "s4", "sr": "4", "insulation": "4th Stack & Earth", "voltage": "5 kV", "unit": "MΩ"},
        {"id": "s5", "sr": "5", "insulation": "5th Stack & Earth", "voltage": "5 kV", "unit": "MΩ"},
        {"id": "s6", "sr": "6", "insulation": "6th Stack & Earth", "voltage": "5 kV", "unit": "MΩ"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- VT_SCR: Surge Counter Reading (3 readings × 3 phases)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VT', 'VT_SCR', 'Surge Counter Reading', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "surge_counter",
      "title": "Surge Counter Reading",
      "type": "phase_columns",
      "phases": ["R", "Y", "B"],
      "fields": [
        {"key": "counter_serial_no", "title": "Counter Serial No.", "type": "string"},
        {"key": "counter_make",      "title": "Counter Make",       "type": "string"},
        {"key": "counter_reading",   "title": "Counter Reading",    "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- VT_THR: Third Harmonic Resistive Current Measurement
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VT', 'VT_THR', 'Third Harmonic Resistive Current Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "thr_header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "ambient_temp", "title": "Ambient Temperature (°C)", "type": "number", "required": true}
      ]
    },
    {
      "id": "thr_table",
      "title": "Third Harmonic Resistive Current Measurement",
      "note": "3rd Harmonic Resistive Current measured in micro-amperes (µA)",
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "total_current",  "title": "Total Current",        "type": "number"},
        {"key": "harmonic_r",     "title": "3rd Harmonic R (µA)",  "type": "number"},
        {"key": "harmonic_y",     "title": "3rd Harmonic Y (µA)",  "type": "number"},
        {"key": "harmonic_b",     "title": "3rd Harmonic B (µA)",  "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- VT_TD: Tan Delta and Capacitance Measurement
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VT', 'VT_TD', 'Tan Delta and Capacitance Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "td_header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "ambient_temp", "title": "Ambient Temp (°C)", "type": "number", "required": true}
      ]
    },
    {
      "id": "td_table",
      "title": "Tan Delta and Capacitance Measurement",
      "type": "dynamic_table",
      "default_rows": 1,
      "columns": [
        {"key": "insulation_tested", "title": "Insulation Tested", "type": "string"},
        {"key": "test_mode",         "title": "Test Mode",         "type": "string"},
        {"key": "test_kv",           "title": "Test kV",           "type": "number"},
        {"key": "capacitance",       "title": "Capacitance",       "type": "number"},
        {"key": "cap_unit",          "title": "Unit",              "type": "enum", "enum": ["pF", "nF", "µF"]},
        {"key": "tan_delta_pct",     "title": "Tan Delta [%]",     "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;
