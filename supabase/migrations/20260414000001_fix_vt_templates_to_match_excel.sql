-- =============================================================================
-- Migration: Fix VT (Voltage Transformer) templates to match the Excel
--            eqp_tables.xlsx "Voltage Transformer" sheet structure.
--
-- The VT sheet in the Excel is a Potential/Instrument Voltage Transformer
-- (like CVT), NOT a Lightning Arrestor.  Migration 20260411000005 incorrectly
-- modelled VT after LA.  This migration corrects that.
--
-- Changes:
--   VT_NP   : UPDATED  — Equipment Technical Details + Winding per phase + Site
--   VT_VRT  : INSERTED — Voltage Ratio Test (9 rows: R/Y/B × 3 windings)
--   VT_POL  : INSERTED — Polarity Test (3 core rows)
--   VT_SWR  : INSERTED — Secondary Winding Resistance (4 cores)
--   VT_IR   : UPDATED  — Insulation Resistance (10 predefined rows, per-phase)
--   VT_COW  : INSERTED — Continuity of Winding (3 terminal rows)
--   VT_TD   : UPDATED  — Tan Delta & Capacitance (8-row dynamic, R/Y/B cols)
--   VT_SCR  : DEACTIVATED — not applicable to VT (was copied from LA)
--   VT_THR  : DEACTIVATED — not applicable to VT (was copied from LA)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- VT_NP: Equipment Technical Details + per-phase Winding Details + Site
-- ---------------------------------------------------------------------------
UPDATE test_templates SET
  test_name = 'Equipment Nameplate & Winding Details',
  tab       = 'NAMEPLATE',
  fields    = '{
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
  }'::jsonb
WHERE test_code = 'VT_NP' AND equipment_type = 'VT';


-- ---------------------------------------------------------------------------
-- VT_VRT: Voltage Ratio Test — 9 rows (R/Y/B × 3 windings)
-- ---------------------------------------------------------------------------
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
  test_name = EXCLUDED.test_name,
  tab       = EXCLUDED.tab,
  fields    = EXCLUDED.fields,
  is_active = TRUE;


-- ---------------------------------------------------------------------------
-- VT_POL: Polarity Test — 3 cores
-- ---------------------------------------------------------------------------
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
  test_name = EXCLUDED.test_name,
  tab       = EXCLUDED.tab,
  fields    = EXCLUDED.fields,
  is_active = TRUE;


-- ---------------------------------------------------------------------------
-- VT_SWR: Secondary Winding Resistance — 4 cores × Measured(R/Y/B) + Factory(R/Y/B)
-- ---------------------------------------------------------------------------
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
  test_name = EXCLUDED.test_name,
  tab       = EXCLUDED.tab,
  fields    = EXCLUDED.fields,
  is_active = TRUE;


-- ---------------------------------------------------------------------------
-- VT_IR: Insulation Resistance — 10 predefined rows, per-phase R/Y/B values
-- ---------------------------------------------------------------------------
UPDATE test_templates SET
  test_name = 'Insulation Resistance Measurement',
  tab       = 'PARAMETERS',
  fields    = '{
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
  }'::jsonb
WHERE test_code = 'VT_IR' AND equipment_type = 'VT';


-- ---------------------------------------------------------------------------
-- VT_COW: Continuity of Winding (after removing Earth link) — 3 terminal rows
-- ---------------------------------------------------------------------------
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
  test_name = EXCLUDED.test_name,
  tab       = EXCLUDED.tab,
  fields    = EXCLUDED.fields,
  is_active = TRUE;


-- ---------------------------------------------------------------------------
-- VT_TD: Tan Delta and Capacitance — 8-row dynamic, per-phase R/Y/B columns
-- ---------------------------------------------------------------------------
UPDATE test_templates SET
  test_name = 'Tan Delta and Capacitance Measurement',
  tab       = 'PARAMETERS',
  fields    = '{
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
  }'::jsonb
WHERE test_code = 'VT_TD' AND equipment_type = 'VT';


-- ---------------------------------------------------------------------------
-- Deactivate LA-specific templates that do not apply to VT
-- ---------------------------------------------------------------------------
UPDATE test_templates SET is_active = FALSE
WHERE equipment_type = 'VT' AND test_code IN ('VT_SCR', 'VT_THR');
