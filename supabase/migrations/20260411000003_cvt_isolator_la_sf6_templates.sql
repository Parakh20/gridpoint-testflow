-- =============================================================================
-- Migration: CVT, Isolator, Lightning Arrestor, and SF6 Breaker templates
-- Based on actual test forms from the Switchyard Testing Platform PDFs.
--
-- Equipment types (already in enum): CVT, ISOLATOR, LA, SF6_BREAKER
--
-- Templates added:
--   CVT  : CVT_NP, CVT_SITE, CVT_VRT, CVT_POL, CVT_SWR, CVT_IR, CVT_COW, CVT_TD
--   ISO  : ISO_NP, ISO_CRM_C, ISO_CRM_O, ISO_IR
--   LA   : LA_NP, LA_IR, LA_SCR, LA_THR, LA_TD
--   SF6  : SF6_NP, SF6_OTT, SF6_CRM, SF6_IR_O, SF6_IR_C, SF6_CCT, SF6_DCRM, SF6_DP
-- =============================================================================


-- =============================================================================
-- CVT — Capacitive Voltage Transformer
-- =============================================================================

-- CVT_NP: Equipment Technical Details + per-phase Winding Details
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CVT', 'CVT_NP', 'Equipment Nameplate & Winding Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "tech_details",
      "title": "Equipment Technical Details",
      "type": "fields",
      "fields": [
        {"key": "equipment_location", "title": "Equipment Location / Bay",  "type": "string", "required": true},
        {"key": "phase",              "title": "Phase (R / Y / B)",          "type": "string"},
        {"key": "rated_primary_voltage", "title": "Rated Primary Voltage",   "type": "string", "required": true},
        {"key": "rated_frequency",    "title": "Rated Frequency (Hz)",       "type": "number", "default": 50}
      ]
    },
    {
      "id": "winding_details",
      "title": "Winding Details",
      "type": "phase_columns",
      "phases": ["R", "Y", "B"],
      "fields": [
        {"key": "serial_number",         "title": "Serial Number",          "type": "string", "required": true},
        {"key": "manufacturer",          "title": "Manufacturer",           "type": "string"},
        {"key": "year_of_manufacture",   "title": "Year of Manufacture",    "type": "string"},
        {"key": "winding_designation",   "title": "Winding Designation",    "type": "string"},
        {"key": "rated_secondary_voltage","title": "Rated Secondary Voltage","type": "string"},
        {"key": "rated_burden",          "title": "Rated Burden",           "type": "string"},
        {"key": "voltage_class",         "title": "Voltage Class",          "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- CVT_SITE: Site Testing Details
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CVT', 'CVT_SITE', 'Site Testing Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "site",
      "title": "Site Testing Details",
      "type": "fields",
      "fields": [
        {"key": "date_of_testing",   "title": "Date of Testing",        "type": "date",   "required": true},
        {"key": "ambient_temp",      "title": "Ambient Temperature (°C)","type": "number", "required": true},
        {"key": "testing_done_by",   "title": "Testing Done By",        "type": "string", "required": true},
        {"key": "test_witnessed_by", "title": "Test Witnessed By",      "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- CVT_VRT: Voltage Ratio Test
-- 9 fixed rows: each phase (R/Y/B) × three windings (1a-1n, 2a-2n, 3a-3n)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CVT', 'CVT_VRT', 'Voltage Ratio Test', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "vrt",
      "title": "Voltage Ratio Test",
      "type": "ir_fixed",
      "row_label_header": "Phase / Winding",
      "rows": [
        {"id": "r_1a1n", "sr": "1",  "label": "R  –  1a-1n"},
        {"id": "r_2a2n", "sr": "2",  "label": "R  –  2a-2n"},
        {"id": "r_3a3n", "sr": "3",  "label": "R  –  3a-3n"},
        {"id": "y_1a1n", "sr": "4",  "label": "Y  –  1a-1n"},
        {"id": "y_2a2n", "sr": "5",  "label": "Y  –  2a-2n"},
        {"id": "y_3a3n", "sr": "6",  "label": "Y  –  3a-3n"},
        {"id": "b_1a1n", "sr": "7",  "label": "B  –  1a-1n"},
        {"id": "b_2a2n", "sr": "8",  "label": "B  –  2a-2n"},
        {"id": "b_3a3n", "sr": "9",  "label": "B  –  3a-3n"}
      ],
      "columns": [
        {"key": "applied_voltage",    "title": "Applied Voltage (V)",          "type": "number"},
        {"key": "measured_voltage",   "title": "Measured Secondary Voltage (V)","type": "number"},
        {"key": "theoretical_ratio",  "title": "Theoretical Ratio",            "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- CVT_POL: Polarity Test
-- Core rows with polarity (enum: Correct / Reverse)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CVT', 'CVT_POL', 'Polarity Test', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "polarity",
      "title": "Polarity Test",
      "type": "ir_fixed",
      "row_label_header": "Core / Terminal",
      "rows": [
        {"id": "core_1", "sr": "1", "label": "Core 1  (1a-1n)"},
        {"id": "core_2", "sr": "2", "label": "Core 2  (2a-1n)"},
        {"id": "core_3", "sr": "3", "label": "Core 3  (3a-1n)"}
      ],
      "columns": [
        {"key": "polarity", "title": "Polarity", "type": "enum", "enum": ["Correct", "Reverse", "Not Tested"]}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- CVT_SWR: Secondary Winding Resistance Measurement
-- Core rows × Measured (R/Y/B) and Factory (R/Y/B) columns
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CVT', 'CVT_SWR', 'Secondary Winding Resistance Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "swr_header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "amb_temp_start", "title": "Ambient Temp – Start (°C)", "type": "number", "required": true},
        {"key": "amb_temp_end",   "title": "Ambient Temp – End (°C)",   "type": "number"}
      ]
    },
    {
      "id": "swr_table",
      "title": "Winding Resistance (Measured vs Factory Values)",
      "type": "core_table",
      "num_cores_default": 4,
      "columns": [
        {"key": "meas_r",    "title": "Measured R",  "type": "number"},
        {"key": "meas_y",    "title": "Measured Y",  "type": "number"},
        {"key": "meas_b",    "title": "Measured B",  "type": "number"},
        {"key": "factory_r", "title": "Factory R",   "type": "number"},
        {"key": "factory_y", "title": "Factory Y",   "type": "number"},
        {"key": "factory_b", "title": "Factory B",   "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- CVT_IR: Insulation Resistance Measurement at 5 kV / 500 V
-- 10 predefined rows, per-phase (R/Y/B) measured values
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CVT', 'CVT_IR', 'Insulation Resistance Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "ir_table",
      "title": "Insulation Resistance Measurement",
      "type": "ir_fixed_phase",
      "phases": ["R", "Y", "B"],
      "rows": [
        {"id": "1",  "sr": "1",  "insulation": "Primary – Earth",          "voltage": "5 kV",  "unit": "MΩ"},
        {"id": "2",  "sr": "2",  "insulation": "Primary – Secondary (Core 1)", "voltage": "5 kV", "unit": "MΩ"},
        {"id": "3",  "sr": "3",  "insulation": "Primary – Secondary (Core 2)", "voltage": "5 kV", "unit": "MΩ"},
        {"id": "4",  "sr": "4",  "insulation": "Primary – Secondary (Core 3)", "voltage": "5 kV", "unit": "MΩ"},
        {"id": "5",  "sr": "5",  "insulation": "Core 1 – Earth",           "voltage": "500 V", "unit": "MΩ"},
        {"id": "6",  "sr": "6",  "insulation": "Core 2 – Earth",           "voltage": "500 V", "unit": "MΩ"},
        {"id": "7",  "sr": "7",  "insulation": "Core 1 – Core 2",          "voltage": "500 V", "unit": "MΩ"},
        {"id": "8",  "sr": "8",  "insulation": "Core 3 – Earth",           "voltage": "500 V", "unit": "MΩ"},
        {"id": "9",  "sr": "9",  "insulation": "Core 1 – Core 3",          "voltage": "500 V", "unit": "MΩ"},
        {"id": "10", "sr": "10", "insulation": "Core 2 – Core 3",          "voltage": "500 V", "unit": "MΩ"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- CVT_COW: Continuity of Winding (after removing Earth link)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CVT', 'CVT_COW', 'Continuity of Winding', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "continuity",
      "title": "Continuity of Winding",
      "note": "Tested after removing Earth link",
      "type": "ir_fixed",
      "row_label_header": "Between Terminals",
      "rows": [
        {"id": "w1", "sr": "1", "label": "1a – 1n"},
        {"id": "w2", "sr": "2", "label": "2a – 1n"},
        {"id": "w3", "sr": "3", "label": "3a – 1n"}
      ],
      "columns": [
        {"key": "result", "title": "Continuity", "type": "enum", "enum": ["Yes", "No"]}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- CVT_TD: Tan Delta and Capacitance Measurement of Windings
-- Dynamic rows; per-phase (R/Y/B) capacitance and tan delta columns
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CVT', 'CVT_TD', 'Tan Delta and Capacitance Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "td_header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "amb_temp_start", "title": "Ambient Temp – Start (°C)", "type": "number", "required": true},
        {"key": "amb_temp_end",   "title": "Ambient Temp – End (°C)",   "type": "number"}
      ]
    },
    {
      "id": "td_table",
      "title": "Tan Delta and Capacitance Measurement of Windings",
      "type": "dynamic_table",
      "default_rows": 8,
      "columns": [
        {"key": "insulation_tested", "title": "Insulation Tested", "type": "string"},
        {"key": "test_mode",         "title": "Test Mode",         "type": "string"},
        {"key": "test_kv",           "title": "Test kV",           "type": "number"},
        {"key": "cap_r",             "title": "Cap R",             "type": "number"},
        {"key": "cap_y",             "title": "Cap Y",             "type": "number"},
        {"key": "cap_b",             "title": "Cap B",             "type": "number"},
        {"key": "td_r",              "title": "Tan δ R [%]",       "type": "number"},
        {"key": "td_y",              "title": "Tan δ Y [%]",       "type": "number"},
        {"key": "td_b",              "title": "Tan δ B [%]",       "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- =============================================================================
-- ISOLATOR
-- =============================================================================

-- ISO_NP: Nameplate + Phase Details + Site Testing Details
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('ISOLATOR', 'ISO_NP', 'Isolator Nameplate & Site Testing Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "common",
      "title": "Section 1: Common Equipment Details (Same for All Phases)",
      "type": "fields",
      "fields": [
        {"key": "feeder_bay_name",      "title": "Feeder / Bay Name",        "type": "string", "required": true},
        {"key": "voltage_rating_kv",    "title": "Voltage Rating (kV)",      "type": "string"},
        {"key": "system_voltage_kv",    "title": "System Voltage (kV)",      "type": "string"},
        {"key": "rated_frequency_hz",   "title": "Rated Frequency (Hz)",     "type": "number", "default": 50},
        {"key": "current_rating_a",     "title": "Current Rating (A)",       "type": "string"},
        {"key": "breaking_capacity_ka", "title": "Breaking Capacity (kA)",   "type": "string"},
        {"key": "operating_mechanism",  "title": "Operating Mechanism",      "type": "string"}
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


-- ISO_CRM_C: Contact Resistance Measurement – Close Condition
-- 6 rows: R, R', Y, Y', B, B'
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('ISOLATOR', 'ISO_CRM_C', 'Contact Resistance – Close Condition', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crm_close",
      "title": "Contact Resistance Measurement (Close Condition)",
      "type": "ir_fixed",
      "row_label_header": "Phase",
      "rows": [
        {"id": "R",  "sr": "1", "label": "R"},
        {"id": "Rp", "sr": "2", "label": "R′"},
        {"id": "Y",  "sr": "3", "label": "Y"},
        {"id": "Yp", "sr": "4", "label": "Y′"},
        {"id": "B",  "sr": "5", "label": "B"},
        {"id": "Bp", "sr": "6", "label": "B′"}
      ],
      "columns": [
        {"key": "crm_microohms", "title": "CRM (Micro-ohms)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- ISO_CRM_O: Contact Resistance Measurement – Open Condition (Earth Switch)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('ISOLATOR', 'ISO_CRM_O', 'Contact Resistance – Open Condition', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crm_open",
      "title": "Contact Resistance Measurement (Open Condition)",
      "type": "ir_fixed",
      "row_label_header": "Measurement",
      "rows": [
        {"id": "earth_sw", "sr": "1", "label": "Earth Switch"}
      ],
      "columns": [
        {"key": "crm_microohms", "title": "CRM (Micro-ohms)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- ISO_IR: Insulation Resistance Measurement at 5000 V
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('ISOLATOR', 'ISO_IR', 'Insulation Resistance Measurement at 5000 V', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "ir_table",
      "title": "Insulation Resistance Measurement at 5000 Volts",
      "type": "ir_fixed",
      "row_label_header": "Between",
      "rows": [
        {"id": "mc_gnd", "sr": "1", "label": "Main Contact to Ground"}
      ],
      "columns": [
        {"key": "reading_mohm", "title": "Reading (MΩ)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- =============================================================================
-- LA — Lightning Arrestor
-- =============================================================================

-- LA_NP: Nameplate + Phase Details + Site Testing Details
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('LA', 'LA_NP', 'Lightning Arrestor Nameplate & Site Testing Details', 'NAMEPLATE', '{
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


-- LA_IR: Insulation Resistance at 5000 V (up to 6 stacks per phase)
-- Note on sheet: "Stack size formula required – example 1, 2, 4"
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('LA', 'LA_IR', 'Insulation Resistance Measurement at 5000 V', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "la_ir",
      "title": "Insulation Resistance Measurement at 5000 Volts",
      "note": "Stack size / formula required (example: 1, 2, 4). Fill rows for stacks present on this LA unit.",
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


-- LA_SCR: Surge Counter Reading (3 readings × 3 phases)
-- Phase columns (R/Y/B) with fields as rows: Counter Serial No., Counter Make, Counter Reading
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('LA', 'LA_SCR', 'Surge Counter Reading', 'PARAMETERS', '{
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


-- LA_THR: Third Harmonic Resistive Current Measurement
-- Phase rows (R/Y/B) with Total Current + 3rd Harmonic per-phase columns
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('LA', 'LA_THR', 'Third Harmonic Resistive Current Measurement', 'PARAMETERS', '{
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


-- LA_TD: Tan Delta and Capacitance Measurement
-- Simple: R-E, GST/UST mode, 10 kV default; dynamic rows in case additional tests needed
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('LA', 'LA_TD', 'Tan Delta and Capacitance Measurement', 'PARAMETERS', '{
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
      "title": "Tan Delta and Capacitance Measurement of Windings",
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


-- =============================================================================
-- SF6_BREAKER — SF6 Circuit Breaker
-- =============================================================================

-- SF6_NP: Equipment & Site Details
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_NP', 'SF6 Breaker Equipment & Site Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "equipment",
      "title": "Equipment Details",
      "type": "fields",
      "fields": [
        {"key": "equipment_location",     "title": "Equipment Location / Bay",  "type": "string", "required": true},
        {"key": "phase_r_id",             "title": "Phase R Designation",       "type": "string"},
        {"key": "phase_y_id",             "title": "Phase Y Designation",       "type": "string"},
        {"key": "phase_b_id",             "title": "Phase B Designation",       "type": "string"},
        {"key": "serial_number",          "title": "Serial Number",             "type": "string", "required": true},
        {"key": "manufacturer",           "title": "Manufacturer",              "type": "string"},
        {"key": "year_of_manufacture",    "title": "Year of Manufacture",       "type": "string"},
        {"key": "type_model",             "title": "Type / Model",              "type": "string"},
        {"key": "rating",                 "title": "Rating",                    "type": "string"},
        {"key": "operating_voltage",      "title": "Operating Voltage",         "type": "string"},
        {"key": "control_voltage_dc",     "title": "Control Voltage (DC)",      "type": "string"},
        {"key": "rated_secondary_voltage","title": "Rated Secondary Voltage",   "type": "string"},
        {"key": "rated_burden_1",         "title": "Rated Burden 1",            "type": "string"},
        {"key": "rated_burden_2",         "title": "Rated Burden 2",            "type": "string"},
        {"key": "voltage_class",          "title": "Voltage Class",             "type": "string"}
      ]
    },
    {
      "id": "site_testing",
      "title": "Site Testing Details",
      "type": "fields",
      "fields": [
        {"key": "date_site_reporting", "title": "Date of Site Reporting", "type": "date"},
        {"key": "date_testing",        "title": "Date of Testing",        "type": "date", "required": true},
        {"key": "ambient_temp",        "title": "Ambient Temperature (°C)","type": "number", "required": true},
        {"key": "testing_done_by",     "title": "Testing Done By",        "type": "string", "required": true}
      ]
    },
    {
      "id": "customer",
      "title": "Customer Details",
      "type": "fields",
      "fields": [
        {"key": "end_customer",      "title": "End Customer",        "type": "string"},
        {"key": "client_contractor", "title": "Client / Contractor", "type": "string"},
        {"key": "test_witnessed_by", "title": "Test Witnessed By",   "type": "string"}
      ]
    },
    {
      "id": "location",
      "title": "Site Location Details",
      "type": "fields",
      "fields": [
        {"key": "project_name",     "title": "Name of the Project", "type": "string"},
        {"key": "location_address", "title": "Location – Address",  "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- SF6_OTT: Operating Time Table
-- 36 predefined rows: 3 phases × 3 contact types × 4 breaks
-- Columns: Close (ms), Open:Trip1 (ms), Open:Trip2 (ms), Close-Open:CO1 (ms), CO2 (ms)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_OTT', 'Operating Time Table', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "ott",
      "title": "Operating Time Table",
      "type": "ir_fixed",
      "row_label_header": "Phase / Contact / Break",
      "rows": [
        {"id": "r_mc_b1", "sr": "1",  "label": "R  /  Main Contact  /  Break 1"},
        {"id": "r_mc_b2", "sr": "2",  "label": "R  /  Main Contact  /  Break 2"},
        {"id": "r_mc_b3", "sr": "3",  "label": "R  /  Main Contact  /  Break 3"},
        {"id": "r_mc_b4", "sr": "4",  "label": "R  /  Main Contact  /  Break 4"},
        {"id": "y_mc_b1", "sr": "5",  "label": "Y  /  Main Contact  /  Break 1"},
        {"id": "y_mc_b2", "sr": "6",  "label": "Y  /  Main Contact  /  Break 2"},
        {"id": "y_mc_b3", "sr": "7",  "label": "Y  /  Main Contact  /  Break 3"},
        {"id": "y_mc_b4", "sr": "8",  "label": "Y  /  Main Contact  /  Break 4"},
        {"id": "b_mc_b1", "sr": "9",  "label": "B  /  Main Contact  /  Break 1"},
        {"id": "b_mc_b2", "sr": "10", "label": "B  /  Main Contact  /  Break 2"},
        {"id": "b_mc_b3", "sr": "11", "label": "B  /  Main Contact  /  Break 3"},
        {"id": "b_mc_b4", "sr": "12", "label": "B  /  Main Contact  /  Break 4"},
        {"id": "r_pir_b1","sr": "13", "label": "R  /  PIR  /  Break 1"},
        {"id": "r_pir_b2","sr": "14", "label": "R  /  PIR  /  Break 2"},
        {"id": "r_pir_b3","sr": "15", "label": "R  /  PIR  /  Break 3"},
        {"id": "r_pir_b4","sr": "16", "label": "R  /  PIR  /  Break 4"},
        {"id": "y_pir_b1","sr": "17", "label": "Y  /  PIR  /  Break 1"},
        {"id": "y_pir_b2","sr": "18", "label": "Y  /  PIR  /  Break 2"},
        {"id": "y_pir_b3","sr": "19", "label": "Y  /  PIR  /  Break 3"},
        {"id": "y_pir_b4","sr": "20", "label": "Y  /  PIR  /  Break 4"},
        {"id": "b_pir_b1","sr": "21", "label": "B  /  PIR  /  Break 1"},
        {"id": "b_pir_b2","sr": "22", "label": "B  /  PIR  /  Break 2"},
        {"id": "b_pir_b3","sr": "23", "label": "B  /  PIR  /  Break 3"},
        {"id": "b_pir_b4","sr": "24", "label": "B  /  PIR  /  Break 4"},
        {"id": "r_ac_b1", "sr": "25", "label": "R  /  Aux Contact  /  Break 1"},
        {"id": "r_ac_b2", "sr": "26", "label": "R  /  Aux Contact  /  Break 2"},
        {"id": "r_ac_b3", "sr": "27", "label": "R  /  Aux Contact  /  Break 3"},
        {"id": "r_ac_b4", "sr": "28", "label": "R  /  Aux Contact  /  Break 4"},
        {"id": "y_ac_b1", "sr": "29", "label": "Y  /  Aux Contact  /  Break 1"},
        {"id": "y_ac_b2", "sr": "30", "label": "Y  /  Aux Contact  /  Break 2"},
        {"id": "y_ac_b3", "sr": "31", "label": "Y  /  Aux Contact  /  Break 3"},
        {"id": "y_ac_b4", "sr": "32", "label": "Y  /  Aux Contact  /  Break 4"},
        {"id": "b_ac_b1", "sr": "33", "label": "B  /  Aux Contact  /  Break 1"},
        {"id": "b_ac_b2", "sr": "34", "label": "B  /  Aux Contact  /  Break 2"},
        {"id": "b_ac_b3", "sr": "35", "label": "B  /  Aux Contact  /  Break 3"},
        {"id": "b_ac_b4", "sr": "36", "label": "B  /  Aux Contact  /  Break 4"}
      ],
      "columns": [
        {"key": "close_ms",      "title": "Close (ms)",         "type": "number"},
        {"key": "open_trip1_ms", "title": "Open: Trip 1 (ms)",  "type": "number"},
        {"key": "open_trip2_ms", "title": "Open: Trip 2 (ms)",  "type": "number"},
        {"key": "co1_ms",        "title": "Close-Open: CO1 (ms)","type": "number"},
        {"key": "co2_ms",        "title": "CO2 (ms)",           "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- SF6_CRM: Contact Resistance Measurement Table
-- 12 rows: R1-R4, Y1-Y4, B1-B4
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_CRM', 'Contact Resistance Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crm",
      "title": "Contact Resistance Measurement Table",
      "type": "ir_fixed",
      "row_label_header": "Phase Break",
      "rows": [
        {"id": "R1", "sr": "1",  "label": "R1"},
        {"id": "R2", "sr": "2",  "label": "R2"},
        {"id": "R3", "sr": "3",  "label": "R3"},
        {"id": "R4", "sr": "4",  "label": "R4"},
        {"id": "Y1", "sr": "5",  "label": "Y1"},
        {"id": "Y2", "sr": "6",  "label": "Y2"},
        {"id": "Y3", "sr": "7",  "label": "Y3"},
        {"id": "Y4", "sr": "8",  "label": "Y4"},
        {"id": "B1", "sr": "9",  "label": "B1"},
        {"id": "B2", "sr": "10", "label": "B2"},
        {"id": "B3", "sr": "11", "label": "B3"},
        {"id": "B4", "sr": "12", "label": "B4"}
      ],
      "columns": [
        {"key": "crm_microohms", "title": "CRM (Micro-ohms)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- SF6_IR_O: Insulation Resistance with Breaker Open at 5000 V
-- Phase rows (R/Y/B) × Break columns (1-4)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_IR_O', 'Insulation Resistance – Breaker Open', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "ir_open",
      "title": "Insulation Resistance with Breaker Open at 5000 Volts",
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "break_1", "title": "Across Open Contact Break 1 (MΩ)", "type": "number"},
        {"key": "break_2", "title": "Break 2 (MΩ)",                      "type": "number"},
        {"key": "break_3", "title": "Break 3 (MΩ)",                      "type": "number"},
        {"key": "break_4", "title": "Break 4 (MΩ)",                      "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- SF6_IR_C: Insulation Resistance with Breaker Closed, Earth Switch & Isolator Open
-- 6 fixed test points: R1-G, R2-G, Y1-G, Y2-G, B1-G, B2-G
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_IR_C', 'Insulation Resistance – Breaker Closed', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "ir_closed",
      "title": "Insulation Resistance with Breaker Closed, Earth Switch & Isolator Open",
      "type": "ir_fixed",
      "row_label_header": "Test Point",
      "rows": [
        {"id": "R1G", "sr": "1", "label": "R1 – G"},
        {"id": "R2G", "sr": "2", "label": "R2 – G"},
        {"id": "Y1G", "sr": "3", "label": "Y1 – G"},
        {"id": "Y2G", "sr": "4", "label": "Y2 – G"},
        {"id": "B1G", "sr": "5", "label": "B1 – G"},
        {"id": "B2G", "sr": "6", "label": "B2 – G"}
      ],
      "columns": [
        {"key": "reading_mohm", "title": "Reading (MΩ)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- SF6_CCT: Coil Characteristics Table
-- 12 rows: R1/R2/Y1/Y2/B1/B2 × Resistance (Ω) and Current (Amp) each
-- Columns: Closing Coil, Trip Coil-1, Trip Coil-2
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_CCT', 'Coil Characteristics Table', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "coil_char",
      "title": "Coil Characteristics Table",
      "type": "ir_fixed",
      "row_label_header": "Phase / Parameter",
      "rows": [
        {"id": "R1_res",  "sr": "1",  "label": "R1  –  Resistance (Ω)"},
        {"id": "R1_curr", "sr": "2",  "label": "R1  –  Current (Amp)"},
        {"id": "R2_res",  "sr": "3",  "label": "R2  –  Resistance (Ω)"},
        {"id": "R2_curr", "sr": "4",  "label": "R2  –  Current (Amp)"},
        {"id": "Y1_res",  "sr": "5",  "label": "Y1  –  Resistance (Ω)"},
        {"id": "Y1_curr", "sr": "6",  "label": "Y1  –  Current (Amp)"},
        {"id": "Y2_res",  "sr": "7",  "label": "Y2  –  Resistance (Ω)"},
        {"id": "Y2_curr", "sr": "8",  "label": "Y2  –  Current (Amp)"},
        {"id": "B1_res",  "sr": "9",  "label": "B1  –  Resistance (Ω)"},
        {"id": "B1_curr", "sr": "10", "label": "B1  –  Current (Amp)"},
        {"id": "B2_res",  "sr": "11", "label": "B2  –  Resistance (Ω)"},
        {"id": "B2_curr", "sr": "12", "label": "B2  –  Current (Amp)"}
      ],
      "columns": [
        {"key": "closing_coil", "title": "Closing Coil", "type": "number"},
        {"key": "trip_coil_1",  "title": "Trip Coil-1",  "type": "number"},
        {"key": "trip_coil_2",  "title": "Trip Coil-2",  "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- SF6_DCRM: Dynamic Contact Resistance Measurement
-- Note section + phase rows with remarks and witness name
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_DCRM', 'Dynamic Contact Resistance Measurement (DCRM)', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "dcrm_note",
      "title": "Dynamic Contact Resistance Measurement (DCRM)",
      "note": "DCRM testing was performed and system-generated reports from the testing equipment shall be submitted. Enter remarks and witness sign-off below.",
      "type": "fields",
      "fields": []
    },
    {
      "id": "dcrm_table",
      "title": "",
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "remarks",        "title": "Remarks",             "type": "string"},
        {"key": "witness_name",   "title": "Witness Name & Sign", "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- SF6_DP: Measurement of Dew Point of SF6 Gas
-- 6 fixed CB poles: R1, R2, Y1, Y2, B1, B2
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_DP', 'Dew Point of SF6 Gas', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "dew_point",
      "title": "Measurement of Dew Point of SF6 Gas",
      "type": "ir_fixed",
      "row_label_header": "CB Pole",
      "rows": [
        {"id": "R1", "sr": "1", "label": "R1"},
        {"id": "R2", "sr": "2", "label": "R2"},
        {"id": "Y1", "sr": "3", "label": "Y1"},
        {"id": "Y2", "sr": "4", "label": "Y2"},
        {"id": "B1", "sr": "5", "label": "B1"},
        {"id": "B2", "sr": "6", "label": "B2"}
      ],
      "columns": [
        {"key": "measured_value", "title": "Measured Value (°C or ppm)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;
