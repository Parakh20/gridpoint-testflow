-- =============================================================================
-- Migration: Force ALL test templates to v2 section format.
--
-- Previous migrations used ON CONFLICT DO NOTHING or UPDATE-without-UPSERT,
-- leaving stale v1 templates for VCB, EARTH_PIT, CT (old codes), and
-- potentially CVT / ISO / LA / SF6 if migrations ran out of order.
--
-- This migration uses ON CONFLICT DO UPDATE so every template is
-- definitively written to v2 regardless of prior state.
-- =============================================================================


-- =============================================================================
-- CVT — Capacitive Voltage Transformer  (force-update all codes)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CVT', 'CVT_NP', 'Equipment Nameplate & Winding Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "tech_details",
      "title": "Equipment Technical Details",
      "type": "fields",
      "fields": [
        {"key": "equipment_location",    "title": "Equipment Location / Bay",  "type": "string", "required": true},
        {"key": "phase",                 "title": "Phase (R / Y / B)",          "type": "string"},
        {"key": "rated_primary_voltage", "title": "Rated Primary Voltage",      "type": "string", "required": true},
        {"key": "rated_frequency",       "title": "Rated Frequency (Hz)",       "type": "number", "default": 50}
      ]
    },
    {
      "id": "winding_details",
      "title": "Winding Details",
      "type": "phase_columns",
      "phases": ["R", "Y", "B"],
      "fields": [
        {"key": "serial_number",          "title": "Serial Number",           "type": "string", "required": true},
        {"key": "manufacturer",           "title": "Manufacturer",            "type": "string"},
        {"key": "year_of_manufacture",    "title": "Year of Manufacture",     "type": "string"},
        {"key": "winding_designation",    "title": "Winding Designation",     "type": "string"},
        {"key": "rated_secondary_voltage","title": "Rated Secondary Voltage", "type": "string"},
        {"key": "rated_burden",           "title": "Rated Burden",            "type": "string"},
        {"key": "voltage_class",          "title": "Voltage Class",           "type": "string"}
      ]
    },
    {
      "id": "site",
      "title": "Site Testing Details",
      "type": "fields",
      "fields": [
        {"key": "date_of_testing",   "title": "Date of Testing",         "type": "date",   "required": true},
        {"key": "ambient_temp",      "title": "Ambient Temperature (°C)","type": "number", "required": true},
        {"key": "testing_done_by",   "title": "Testing Done By",         "type": "string", "required": true},
        {"key": "test_witnessed_by", "title": "Test Witnessed By",       "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


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
        {"id": "r_1a1n", "sr": "1", "label": "R  –  1a-1n"},
        {"id": "r_2a2n", "sr": "2", "label": "R  –  2a-2n"},
        {"id": "r_3a3n", "sr": "3", "label": "R  –  3a-3n"},
        {"id": "y_1a1n", "sr": "4", "label": "Y  –  1a-1n"},
        {"id": "y_2a2n", "sr": "5", "label": "Y  –  2a-2n"},
        {"id": "y_3a3n", "sr": "6", "label": "Y  –  3a-3n"},
        {"id": "b_1a1n", "sr": "7", "label": "B  –  1a-1n"},
        {"id": "b_2a2n", "sr": "8", "label": "B  –  2a-2n"},
        {"id": "b_3a3n", "sr": "9", "label": "B  –  3a-3n"}
      ],
      "columns": [
        {"key": "applied_voltage",   "title": "Applied Voltage (V)",           "type": "number"},
        {"key": "measured_voltage",  "title": "Measured Secondary Voltage (V)", "type": "number"},
        {"key": "theoretical_ratio", "title": "Theoretical Ratio",             "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


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
        {"key": "polarity", "title": "Polarity", "type": "enum",
         "enum": ["Correct", "Reverse", "Not Tested"]}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


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
        {"id": "1",  "sr": "1",  "insulation": "Primary – Earth",               "voltage": "5 kV",  "unit": "MΩ"},
        {"id": "2",  "sr": "2",  "insulation": "Primary – Secondary (Core 1)",  "voltage": "5 kV",  "unit": "MΩ"},
        {"id": "3",  "sr": "3",  "insulation": "Primary – Secondary (Core 2)",  "voltage": "5 kV",  "unit": "MΩ"},
        {"id": "4",  "sr": "4",  "insulation": "Primary – Secondary (Core 3)",  "voltage": "5 kV",  "unit": "MΩ"},
        {"id": "5",  "sr": "5",  "insulation": "Core 1 – Earth",                "voltage": "500 V", "unit": "MΩ"},
        {"id": "6",  "sr": "6",  "insulation": "Core 2 – Earth",                "voltage": "500 V", "unit": "MΩ"},
        {"id": "7",  "sr": "7",  "insulation": "Core 1 – Core 2",               "voltage": "500 V", "unit": "MΩ"},
        {"id": "8",  "sr": "8",  "insulation": "Core 3 – Earth",                "voltage": "500 V", "unit": "MΩ"},
        {"id": "9",  "sr": "9",  "insulation": "Core 1 – Core 3",               "voltage": "500 V", "unit": "MΩ"},
        {"id": "10", "sr": "10", "insulation": "Core 2 – Core 3",               "voltage": "500 V", "unit": "MΩ"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;

-- Deactivate the old CVT_CON (Capacitance Test – replaced by CVT_TD)
UPDATE test_templates SET is_active = FALSE
WHERE equipment_type = 'CVT' AND test_code = 'CVT_CON';


-- =============================================================================
-- ISOLATOR
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('ISOLATOR', 'ISO_NP', 'Isolator Nameplate & Site Testing Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "common",
      "title": "Section 1: Common Equipment Details (Same for All Phases)",
      "type": "fields",
      "fields": [
        {"key": "feeder_bay_name",    "title": "Feeder / Bay Name",       "type": "string", "required": true},
        {"key": "voltage_rating_kv",  "title": "Voltage Rating (kV)",     "type": "string"},
        {"key": "system_voltage_kv",  "title": "System Voltage (kV)",     "type": "string"},
        {"key": "rated_frequency_hz", "title": "Rated Frequency (Hz)",    "type": "number", "default": 50},
        {"key": "current_rating_a",   "title": "Current Rating (A)",      "type": "number"},
        {"key": "breaking_capacity",  "title": "Breaking Capacity (kA)",  "type": "number"},
        {"key": "operating_mechanism","title": "Operating Mechanism",      "type": "string"}
      ]
    },
    {
      "id": "phase_details",
      "title": "Section 2: Phase-wise Details (R, Y, B)",
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('ISOLATOR', 'ISO_CRI', 'Contact Resistance – Close Condition', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crm_close",
      "title": "Contact Resistance Measurement (Close Condition) – µΩ",
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('ISOLATOR', 'ISO_CRE', 'Contact Resistance – Open Condition (Earth Switch)', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crm_open",
      "title": "Contact Resistance Measurement (Open Condition) – Earth Switch",
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;

-- Keep ISO_CRM_C and ISO_CRM_O in sync (same content, alternate codes)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('ISOLATOR', 'ISO_CRM_C', 'Contact Resistance – Close Condition', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crm_close",
      "title": "Contact Resistance Measurement (Close Condition) – µΩ",
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('ISOLATOR', 'ISO_CRM_O', 'Contact Resistance – Open Condition (Earth Switch)', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crm_open",
      "title": "Contact Resistance Measurement (Open Condition) – Earth Switch",
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


-- =============================================================================
-- LA — Lightning Arrestor
-- =============================================================================

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
      "title": "Section 2: Phase-wise Details (R, Y, B)",
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
        {"key": "date_site_reporting", "title": "Date of Site Reporting","type": "date"},
        {"key": "date_testing",        "title": "Date of Testing",       "type": "date", "required": true},
        {"key": "ambient_temp",        "title": "Ambient Temperature (°C)","type": "number", "required": true},
        {"key": "testing_done_by",     "title": "Testing Done By",       "type": "string", "required": true},
        {"key": "test_witnessed_by",   "title": "Test Witnessed By",     "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('LA', 'LA_IR', 'Insulation Resistance Measurement at 5000 V', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "la_ir",
      "title": "Insulation Resistance Measurement at 5000 Volts",
      "note": "Fill rows for stacks present on this LA unit (up to 6 stacks).",
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('LA', 'LA_SCT', 'Surge Counter Reading', 'PARAMETERS', '{
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('LA', 'LA_THRC', 'Third Harmonic Resistive Current Measurement', 'PARAMETERS', '{
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
        {"key": "total_current", "title": "Total Current",       "type": "number"},
        {"key": "harmonic_r",    "title": "3rd Harmonic R (µA)", "type": "number"},
        {"key": "harmonic_y",    "title": "3rd Harmonic Y (µA)", "type": "number"},
        {"key": "harmonic_b",    "title": "3rd Harmonic B (µA)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


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
      "default_rows": 3,
      "columns": [
        {"key": "insulation_tested", "title": "Insulation Tested", "type": "string"},
        {"key": "test_mode",         "title": "Test Mode",         "type": "string"},
        {"key": "test_kv",           "title": "Test kV",           "type": "number"},
        {"key": "capacitance_pf",    "title": "Capacitance (pF)",  "type": "number"},
        {"key": "tan_delta_pct",     "title": "Tan Delta [%]",     "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


-- =============================================================================
-- SF6_BREAKER
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_NP', 'SF6 Breaker Equipment & Site Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "equip_details",
      "title": "Equipment & Site Details",
      "type": "fields",
      "fields": [
        {"key": "equipment_location",  "title": "Equipment Location / Bay", "type": "string", "required": true},
        {"key": "serial_r",            "title": "Phase R – Serial No.",     "type": "string"},
        {"key": "serial_y",            "title": "Phase Y – Serial No.",     "type": "string"},
        {"key": "serial_b",            "title": "Phase B – Serial No.",     "type": "string"},
        {"key": "manufacturer",        "title": "Manufacturer",             "type": "string"},
        {"key": "year_of_manufacture", "title": "Year of Manufacture",      "type": "string"},
        {"key": "type_model",          "title": "Type / Model",             "type": "string"},
        {"key": "rating",              "title": "Rating",                   "type": "string"},
        {"key": "operating_voltage",   "title": "Operating Voltage",        "type": "string"},
        {"key": "control_voltage_dc",  "title": "Control Voltage (DC)",     "type": "string"}
      ]
    },
    {
      "id": "site",
      "title": "Site Testing Details",
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_TM', 'Operating Time Table', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "ott",
      "title": "Operating Time Table",
      "type": "ir_fixed",
      "row_label_header": "Phase / Contact / Break",
      "rows": [
        {"id": "r_mc_b1",  "sr": "1",  "label": "R  /  Main Contact  /  Break 1"},
        {"id": "r_mc_b2",  "sr": "2",  "label": "R  /  Main Contact  /  Break 2"},
        {"id": "r_mc_b3",  "sr": "3",  "label": "R  /  Main Contact  /  Break 3"},
        {"id": "r_mc_b4",  "sr": "4",  "label": "R  /  Main Contact  /  Break 4"},
        {"id": "y_mc_b1",  "sr": "5",  "label": "Y  /  Main Contact  /  Break 1"},
        {"id": "y_mc_b2",  "sr": "6",  "label": "Y  /  Main Contact  /  Break 2"},
        {"id": "y_mc_b3",  "sr": "7",  "label": "Y  /  Main Contact  /  Break 3"},
        {"id": "y_mc_b4",  "sr": "8",  "label": "Y  /  Main Contact  /  Break 4"},
        {"id": "b_mc_b1",  "sr": "9",  "label": "B  /  Main Contact  /  Break 1"},
        {"id": "b_mc_b2",  "sr": "10", "label": "B  /  Main Contact  /  Break 2"},
        {"id": "b_mc_b3",  "sr": "11", "label": "B  /  Main Contact  /  Break 3"},
        {"id": "b_mc_b4",  "sr": "12", "label": "B  /  Main Contact  /  Break 4"},
        {"id": "r_pir_b1", "sr": "13", "label": "R  /  PIR  /  Break 1"},
        {"id": "r_pir_b2", "sr": "14", "label": "R  /  PIR  /  Break 2"},
        {"id": "r_pir_b3", "sr": "15", "label": "R  /  PIR  /  Break 3"},
        {"id": "r_pir_b4", "sr": "16", "label": "R  /  PIR  /  Break 4"},
        {"id": "y_pir_b1", "sr": "17", "label": "Y  /  PIR  /  Break 1"},
        {"id": "y_pir_b2", "sr": "18", "label": "Y  /  PIR  /  Break 2"},
        {"id": "y_pir_b3", "sr": "19", "label": "Y  /  PIR  /  Break 3"},
        {"id": "y_pir_b4", "sr": "20", "label": "Y  /  PIR  /  Break 4"},
        {"id": "b_pir_b1", "sr": "21", "label": "B  /  PIR  /  Break 1"},
        {"id": "b_pir_b2", "sr": "22", "label": "B  /  PIR  /  Break 2"},
        {"id": "b_pir_b3", "sr": "23", "label": "B  /  PIR  /  Break 3"},
        {"id": "b_pir_b4", "sr": "24", "label": "B  /  PIR  /  Break 4"},
        {"id": "r_ac_b1",  "sr": "25", "label": "R  /  Aux Contact  /  Break 1"},
        {"id": "r_ac_b2",  "sr": "26", "label": "R  /  Aux Contact  /  Break 2"},
        {"id": "r_ac_b3",  "sr": "27", "label": "R  /  Aux Contact  /  Break 3"},
        {"id": "r_ac_b4",  "sr": "28", "label": "R  /  Aux Contact  /  Break 4"},
        {"id": "y_ac_b1",  "sr": "29", "label": "Y  /  Aux Contact  /  Break 1"},
        {"id": "y_ac_b2",  "sr": "30", "label": "Y  /  Aux Contact  /  Break 2"},
        {"id": "y_ac_b3",  "sr": "31", "label": "Y  /  Aux Contact  /  Break 3"},
        {"id": "y_ac_b4",  "sr": "32", "label": "Y  /  Aux Contact  /  Break 4"},
        {"id": "b_ac_b1",  "sr": "33", "label": "B  /  Aux Contact  /  Break 1"},
        {"id": "b_ac_b2",  "sr": "34", "label": "B  /  Aux Contact  /  Break 2"},
        {"id": "b_ac_b3",  "sr": "35", "label": "B  /  Aux Contact  /  Break 3"},
        {"id": "b_ac_b4",  "sr": "36", "label": "B  /  Aux Contact  /  Break 4"}
      ],
      "columns": [
        {"key": "close_ms",      "title": "Close (ms)",           "type": "number"},
        {"key": "open_trip1_ms", "title": "Open: Trip 1 (ms)",    "type": "number"},
        {"key": "open_trip2_ms", "title": "Open: Trip 2 (ms)",    "type": "number"},
        {"key": "co1_ms",        "title": "Close-Open: CO1 (ms)", "type": "number"},
        {"key": "co2_ms",        "title": "CO2 (ms)",             "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_CR', 'Contact Resistance Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crm",
      "title": "Contact Resistance Measurement Table (µΩ)",
      "type": "ir_fixed",
      "row_label_header": "Phase Break",
      "rows": [
        {"id": "R1", "sr": "1",  "label": "R1"}, {"id": "R2", "sr": "2",  "label": "R2"},
        {"id": "R3", "sr": "3",  "label": "R3"}, {"id": "R4", "sr": "4",  "label": "R4"},
        {"id": "Y1", "sr": "5",  "label": "Y1"}, {"id": "Y2", "sr": "6",  "label": "Y2"},
        {"id": "Y3", "sr": "7",  "label": "Y3"}, {"id": "Y4", "sr": "8",  "label": "Y4"},
        {"id": "B1", "sr": "9",  "label": "B1"}, {"id": "B2", "sr": "10", "label": "B2"},
        {"id": "B3", "sr": "11", "label": "B3"}, {"id": "B4", "sr": "12", "label": "B4"}
      ],
      "columns": [
        {"key": "crm_microohms", "title": "CRM (Micro-ohms)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_IRO', 'Insulation Resistance with Breaker Open at 5000 V', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "iro",
      "title": "Insulation Resistance with Breaker Open at 5000 Volts",
      "type": "ir_fixed",
      "row_label_header": "Phase",
      "rows": [
        {"id": "R", "sr": "1", "label": "R"},
        {"id": "Y", "sr": "2", "label": "Y"},
        {"id": "B", "sr": "3", "label": "B"}
      ],
      "columns": [
        {"key": "break1", "title": "Break 1 (MΩ)", "type": "number"},
        {"key": "break2", "title": "Break 2 (MΩ)", "type": "number"},
        {"key": "break3", "title": "Break 3 (MΩ)", "type": "number"},
        {"key": "break4", "title": "Break 4 (MΩ)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_IRC', 'Insulation Resistance with Breaker Closed', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "irc",
      "title": "Insulation Resistance with Breaker Closed, Earth Switch & Isolator Open",
      "type": "ir_fixed",
      "row_label_header": "Measurement",
      "rows": [
        {"id": "r1g", "sr": "1", "label": "R1-G"},
        {"id": "r2g", "sr": "2", "label": "R2-G"},
        {"id": "y1g", "sr": "3", "label": "Y1-G"},
        {"id": "y2g", "sr": "4", "label": "Y2-G"},
        {"id": "b1g", "sr": "5", "label": "B1-G"},
        {"id": "b2g", "sr": "6", "label": "B2-G"}
      ],
      "columns": [
        {"key": "reading_mohm", "title": "Reading (MΩ)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_CC', 'Coil Characteristics', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "coil",
      "title": "Coil Characteristics Table",
      "type": "ir_fixed",
      "row_label_header": "Phase / Parameter",
      "rows": [
        {"id": "r1_res",  "sr": "1",  "label": "R1  –  Resistance (Ω)"},
        {"id": "r1_cur",  "sr": "2",  "label": "R1  –  Current (A)"},
        {"id": "r2_res",  "sr": "3",  "label": "R2  –  Resistance (Ω)"},
        {"id": "r2_cur",  "sr": "4",  "label": "R2  –  Current (A)"},
        {"id": "y1_res",  "sr": "5",  "label": "Y1  –  Resistance (Ω)"},
        {"id": "y1_cur",  "sr": "6",  "label": "Y1  –  Current (A)"},
        {"id": "y2_res",  "sr": "7",  "label": "Y2  –  Resistance (Ω)"},
        {"id": "y2_cur",  "sr": "8",  "label": "Y2  –  Current (A)"},
        {"id": "b1_res",  "sr": "9",  "label": "B1  –  Resistance (Ω)"},
        {"id": "b1_cur",  "sr": "10", "label": "B1  –  Current (A)"},
        {"id": "b2_res",  "sr": "11", "label": "B2  –  Resistance (Ω)"},
        {"id": "b2_cur",  "sr": "12", "label": "B2  –  Current (A)"}
      ],
      "columns": [
        {"key": "closing_coil", "title": "Closing Coil", "type": "number"},
        {"key": "trip_coil_1",  "title": "Trip Coil 1",  "type": "number"},
        {"key": "trip_coil_2",  "title": "Trip Coil 2",  "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_DCR', 'Dynamic Contact Resistance Measurement (DCRM)', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "dcrm",
      "title": "Dynamic Contact Resistance Measurement (DCRM)",
      "note": "DCRM testing was performed. System-generated reports from testing equipment shall be submitted.",
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "remarks",      "title": "Remarks",            "type": "string"},
        {"key": "witness_name", "title": "Witness Name & Sign","type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('SF6_BREAKER', 'SF6_DP', 'Measurement of Dew Point of SF6 Gas', 'PARAMETERS', '{
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
        {"key": "measured_value", "title": "Measured Value", "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


-- =============================================================================
-- VCB — Vacuum Circuit Breaker  (FIRST TIME v2 — was never updated before)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VCB', 'VCB_TM', 'Operating Time Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "timing",
      "title": "Operating Time Measurement",
      "type": "ir_fixed",
      "row_label_header": "Phase / Contact",
      "rows": [
        {"id": "r_mc", "sr": "1", "label": "R  –  Main Contact"},
        {"id": "y_mc", "sr": "2", "label": "Y  –  Main Contact"},
        {"id": "b_mc", "sr": "3", "label": "B  –  Main Contact"},
        {"id": "r_ac", "sr": "4", "label": "R  –  Aux Contact"},
        {"id": "y_ac", "sr": "5", "label": "Y  –  Aux Contact"},
        {"id": "b_ac", "sr": "6", "label": "B  –  Aux Contact"}
      ],
      "columns": [
        {"key": "close_ms",      "title": "Close (ms)",         "type": "number"},
        {"key": "open_trip1_ms", "title": "Open: Trip 1 (ms)", "type": "number"},
        {"key": "open_trip2_ms", "title": "Open: Trip 2 (ms)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VCB', 'VCB_CR', 'Contact Resistance Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crm",
      "title": "Contact Resistance Measurement (µΩ)",
      "type": "ir_fixed",
      "row_label_header": "Phase",
      "rows": [
        {"id": "R", "sr": "1", "label": "R"},
        {"id": "Y", "sr": "2", "label": "Y"},
        {"id": "B", "sr": "3", "label": "B"}
      ],
      "columns": [
        {"key": "crm_microohms", "title": "CRM (Micro-ohms)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VCB', 'VCB_CON', 'Continuity Test', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "continuity",
      "title": "Continuity Test",
      "type": "ir_fixed",
      "row_label_header": "Phase",
      "rows": [
        {"id": "R", "sr": "1", "label": "R"},
        {"id": "Y", "sr": "2", "label": "Y"},
        {"id": "B", "sr": "3", "label": "B"}
      ],
      "columns": [
        {"key": "result", "title": "Continuity", "type": "enum", "enum": ["OK", "Fail", "Not Tested"]}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VCB', 'VCB_HV', 'High Voltage (Dielectric) Test', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "hv_test",
      "title": "High Voltage (Dielectric) Test",
      "type": "ir_fixed",
      "row_label_header": "Phase",
      "rows": [
        {"id": "R", "sr": "1", "label": "R"},
        {"id": "Y", "sr": "2", "label": "Y"},
        {"id": "B", "sr": "3", "label": "B"}
      ],
      "columns": [
        {"key": "test_voltage_kv", "title": "Test Voltage (kV)", "type": "number"},
        {"key": "duration_s",      "title": "Duration (s)",      "type": "number"},
        {"key": "result",          "title": "Result",            "type": "enum",
         "enum": ["Pass", "Fail", "Not Tested"]}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VCB', 'VCB_IRO', 'Insulation Resistance – Breaker Open', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "iro",
      "title": "Insulation Resistance with Breaker Open at 5000 V",
      "type": "ir_fixed",
      "row_label_header": "Phase",
      "rows": [
        {"id": "R", "sr": "1", "label": "R"},
        {"id": "Y", "sr": "2", "label": "Y"},
        {"id": "B", "sr": "3", "label": "B"}
      ],
      "columns": [
        {"key": "val_60s",  "title": "60 s (MΩ)",  "type": "number"},
        {"key": "val_600s", "title": "600 s (MΩ)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VCB', 'VCB_IRC', 'Insulation Resistance – Breaker Closed', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "irc",
      "title": "Insulation Resistance with Breaker Closed at 5000 V",
      "type": "ir_fixed",
      "row_label_header": "Phase",
      "rows": [
        {"id": "R", "sr": "1", "label": "R"},
        {"id": "Y", "sr": "2", "label": "Y"},
        {"id": "B", "sr": "3", "label": "B"}
      ],
      "columns": [
        {"key": "val_60s",  "title": "60 s (MΩ)",  "type": "number"},
        {"key": "val_600s", "title": "600 s (MΩ)", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


-- =============================================================================
-- EARTH_PIT  (FIRST TIME v2 — was never updated before)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('EARTH_PIT', 'EP_EPM', 'Earth Pit Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "ep_details",
      "title": "Earth Pit Details",
      "type": "fields",
      "fields": [
        {"key": "pit_location",    "title": "Pit Location / Tag",        "type": "string", "required": true},
        {"key": "depth_m",         "title": "Depth (m)",                 "type": "number"},
        {"key": "electrode_mat",   "title": "Electrode Material",        "type": "string"},
        {"key": "soil_type",       "title": "Soil Type",                 "type": "string"},
        {"key": "chemical_treat",  "title": "Chemical Treatment",        "type": "enum",
         "enum": ["Yes", "No"]},
        {"key": "date_testing",    "title": "Date of Testing",           "type": "date", "required": true},
        {"key": "ambient_temp",    "title": "Ambient Temperature (°C)",  "type": "number"},
        {"key": "testing_done_by", "title": "Testing Done By",           "type": "string", "required": true}
      ]
    },
    {
      "id": "ep_measurements",
      "title": "Earth Resistance Measurements",
      "type": "dynamic_table",
      "default_rows": 3,
      "row_prompt": "Enter readings for each measurement attempt",
      "columns": [
        {"key": "reading_no",     "title": "Reading No.",    "type": "number"},
        {"key": "resistance_ohm", "title": "Resistance (Ω)", "type": "number"},
        {"key": "remarks",        "title": "Remarks",        "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


-- =============================================================================
-- CT — old template codes (may still be referenced by test_tasks)
-- Force-update them to v2 so they render as tables
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CT', 'CT_WRM', 'Winding Resistance Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "swr_header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "ambient_temp", "title": "Ambient Temp (°C)", "type": "number", "required": true}
      ]
    },
    {
      "id": "winding_table",
      "title": "Secondary Winding Resistance Measurement",
      "type": "ir_fixed",
      "row_label_header": "Phase / Core",
      "rows": [
        {"id": "r_c1", "sr": "1",  "label": "R  –  Core 1  (1S1–1S2)"},
        {"id": "r_c2", "sr": "2",  "label": "R  –  Core 2  (2S1–2S2)"},
        {"id": "r_c3", "sr": "3",  "label": "R  –  Core 3  (3S1–3S2)"},
        {"id": "r_c4", "sr": "4",  "label": "R  –  Core 4  (4S1–4S2)"},
        {"id": "y_c1", "sr": "5",  "label": "Y  –  Core 1  (1S1–1S2)"},
        {"id": "y_c2", "sr": "6",  "label": "Y  –  Core 2  (2S1–2S2)"},
        {"id": "y_c3", "sr": "7",  "label": "Y  –  Core 3  (3S1–3S2)"},
        {"id": "y_c4", "sr": "8",  "label": "Y  –  Core 4  (4S1–4S2)"},
        {"id": "b_c1", "sr": "9",  "label": "B  –  Core 1  (1S1–1S2)"},
        {"id": "b_c2", "sr": "10", "label": "B  –  Core 2  (2S1–2S2)"},
        {"id": "b_c3", "sr": "11", "label": "B  –  Core 3  (3S1–3S2)"},
        {"id": "b_c4", "sr": "12", "label": "B  –  Core 4  (4S1–4S2)"}
      ],
      "columns": [
        {"key": "resistance_ohm", "title": "Resistance (Ω)", "type": "number"},
        {"key": "polarity",       "title": "Polarity",       "type": "enum",
         "enum": ["Correct", "Reverse", "Not Tested"]}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CT', 'CT_POL', 'Polarity Test', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "polarity",
      "title": "Polarity Test",
      "type": "ir_fixed",
      "row_label_header": "Phase / Core",
      "rows": [
        {"id": "r_c1", "sr": "1", "label": "R  –  Core 1"},
        {"id": "r_c2", "sr": "2", "label": "R  –  Core 2"},
        {"id": "r_c3", "sr": "3", "label": "R  –  Core 3"},
        {"id": "r_c4", "sr": "4", "label": "R  –  Core 4"},
        {"id": "y_c1", "sr": "5", "label": "Y  –  Core 1"},
        {"id": "y_c2", "sr": "6", "label": "Y  –  Core 2"},
        {"id": "y_c3", "sr": "7", "label": "Y  –  Core 3"},
        {"id": "y_c4", "sr": "8", "label": "Y  –  Core 4"},
        {"id": "b_c1", "sr": "9", "label": "B  –  Core 1"},
        {"id": "b_c2", "sr": "10","label": "B  –  Core 2"},
        {"id": "b_c3", "sr": "11","label": "B  –  Core 3"},
        {"id": "b_c4", "sr": "12","label": "B  –  Core 4"}
      ],
      "columns": [
        {"key": "polarity", "title": "Polarity", "type": "enum",
         "enum": ["Correct", "Reverse", "Not Tested"]}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CT', 'CT_CRI', 'Current Ratio – Primary Injection Method', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "crp",
      "title": "Current Ratio by Primary Injection Method",
      "type": "ir_fixed",
      "row_label_header": "Phase",
      "rows": [
        {"id": "R", "sr": "1", "label": "R"},
        {"id": "Y", "sr": "2", "label": "Y"},
        {"id": "B", "sr": "3", "label": "B"}
      ],
      "columns": [
        {"key": "applied_primary_a",  "title": "Applied Primary (A)", "type": "number"},
        {"key": "sec_c1",             "title": "1S1–1S2 (A)",         "type": "number"},
        {"key": "sec_c2",             "title": "2S1–2S2 (A)",         "type": "number"},
        {"key": "sec_c3",             "title": "3S1–3S2 (A)",         "type": "number"},
        {"key": "sec_c4",             "title": "4S1–4S2 (A)",         "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CT', 'CT_TD', 'Tan Delta and Capacitance Measurement', 'PARAMETERS', '{
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
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "test_mode",      "title": "Test Mode",        "type": "string"},
        {"key": "test_kv",        "title": "Test kV",          "type": "number"},
        {"key": "capacitance_pf", "title": "Capacitance (pF)", "type": "number"},
        {"key": "tan_delta_pct",  "title": "Tan Delta [%]",    "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CT', 'CT_IR', 'Insulation Resistance Measurement', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "ir_table",
      "title": "Insulation Resistance Measurement",
      "type": "ir_fixed_phase",
      "phases": ["R", "Y", "B"],
      "rows": [
        {"id": "1",  "sr": "1",  "insulation": "Primary – Earth",   "voltage": "5 kV",  "unit": "MΩ/GΩ"},
        {"id": "2",  "sr": "2",  "insulation": "Primary – Core 1",  "voltage": "5 kV",  "unit": "MΩ"},
        {"id": "3",  "sr": "3",  "insulation": "Primary – Core 2",  "voltage": "5 kV",  "unit": "MΩ"},
        {"id": "4",  "sr": "4",  "insulation": "Primary – Core 3",  "voltage": "5 kV",  "unit": "MΩ"},
        {"id": "5",  "sr": "5",  "insulation": "Primary – Core 4",  "voltage": "5 kV",  "unit": "MΩ"},
        {"id": "6",  "sr": "6",  "insulation": "Core 1 – Earth",    "voltage": "500 V", "unit": "MΩ"},
        {"id": "7",  "sr": "7",  "insulation": "Core 2 – Earth",    "voltage": "500 V", "unit": "MΩ"},
        {"id": "8",  "sr": "8",  "insulation": "Core 3 – Earth",    "voltage": "500 V", "unit": "MΩ"},
        {"id": "9",  "sr": "9",  "insulation": "Core 4 – Earth",    "voltage": "500 V", "unit": "MΩ"},
        {"id": "10", "sr": "10", "insulation": "Core 1 – Core 2",   "voltage": "500 V", "unit": "MΩ"},
        {"id": "11", "sr": "11", "insulation": "Core 1 – Core 3",   "voltage": "500 V", "unit": "MΩ"},
        {"id": "12", "sr": "12", "insulation": "Core 1 – Core 4",   "voltage": "500 V", "unit": "MΩ"},
        {"id": "13", "sr": "13", "insulation": "Core 2 – Core 3",   "voltage": "500 V", "unit": "MΩ"},
        {"id": "14", "sr": "14", "insulation": "Core 2 – Core 4",   "voltage": "500 V", "unit": "MΩ"},
        {"id": "15", "sr": "15", "insulation": "Core 3 – Core 4",   "voltage": "500 V", "unit": "MΩ"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;

-- CT_ANALYZER: mark as active v2 placeholder (actual reports are uploaded files)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CT', 'CT_ANALYZER', 'CT Analyzer Test', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "analyzer_note",
      "title": "CT Analyzer Testing (IEC 61869-2)",
      "note": "CT Analyzer system-generated reports (Ratio, Winding Resistance, Excitation, Burden) are submitted as separate PDF attachments per phase and core.",
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "report_ref", "title": "Report Reference / File Name", "type": "string"},
        {"key": "status",     "title": "Status", "type": "enum",
         "enum": ["Uploaded", "Pending", "Not Applicable"]}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


-- =============================================================================
-- VT — Voltage Transformer  (keep in sync with 20260414000001)
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VT', 'VT_VRT', 'Voltage Ratio Test', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "vrt",
      "title": "Voltage Ratio Test",
      "type": "ir_fixed",
      "row_label_header": "Phase / Winding",
      "rows": [
        {"id": "r_1a1n", "sr": "1", "label": "R  –  1a-1n"},
        {"id": "r_2a2n", "sr": "2", "label": "R  –  2a-2n"},
        {"id": "r_3a3n", "sr": "3", "label": "R  –  3a-3n"},
        {"id": "y_1a1n", "sr": "4", "label": "Y  –  1a-1n"},
        {"id": "y_2a2n", "sr": "5", "label": "Y  –  2a-2n"},
        {"id": "y_3a3n", "sr": "6", "label": "Y  –  3a-3n"},
        {"id": "b_1a1n", "sr": "7", "label": "B  –  1a-1n"},
        {"id": "b_2a2n", "sr": "8", "label": "B  –  2a-2n"},
        {"id": "b_3a3n", "sr": "9", "label": "B  –  3a-3n"}
      ],
      "columns": [
        {"key": "applied_voltage",   "title": "Applied Voltage (V)",           "type": "number"},
        {"key": "measured_voltage",  "title": "Measured Secondary Voltage (V)", "type": "number"},
        {"key": "theoretical_ratio", "title": "Theoretical Ratio",             "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VT', 'VT_POL', 'Polarity Test', 'PARAMETERS', '{
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
        {"key": "polarity", "title": "Polarity", "type": "enum",
         "enum": ["Correct", "Reverse", "Not Tested"]}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VT', 'VT_SWR', 'Secondary Winding Resistance Measurement', 'PARAMETERS', '{
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;


INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('VT', 'VT_COW', 'Continuity of Winding', 'PARAMETERS', '{
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
ON CONFLICT (equipment_type, test_code) DO UPDATE SET
  test_name = EXCLUDED.test_name, tab = EXCLUDED.tab,
  fields = EXCLUDED.fields, is_active = EXCLUDED.is_active;

-- Deactivate old VT codes that don't apply (LA-structure leftovers)
UPDATE test_templates SET is_active = FALSE
WHERE equipment_type = 'VT' AND test_code IN ('VT_SCR', 'VT_THR');
