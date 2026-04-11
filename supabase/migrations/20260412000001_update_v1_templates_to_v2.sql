-- =============================================================================
-- Migration: Update all v1 (properties-based) templates to v2 section format.
--
-- Migration 20260411000003 used ON CONFLICT DO NOTHING, leaving old v1 templates
-- untouched for codes that already existed (CVT_VRT, CVT_POL, CVT_SWR, CVT_IR,
-- CVT_TD, LA_IR, LA_TD, ISO_IR, SF6_DP, ISO_CRI, ISO_CRE, SF6_TM, SF6_CR,
-- SF6_CC, SF6_DCR, SF6_IRO, SF6_IRC, LA_SCT, LA_THRC).
--
-- This migration UPDATEs those templates to the v2 section format so all
-- existing test_tasks immediately render with proper tables.
-- =============================================================================


-- =============================================================================
-- CVT
-- =============================================================================

-- CVT_VRT: Voltage Ratio Test (9 rows: R/Y/B × 1a-1n, 2a-2n, 3a-3n)
UPDATE test_templates SET
  test_name = 'Voltage Ratio Test',
  tab = 'PARAMETERS',
  fields = '{
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
          {"key": "applied_voltage",  "title": "Applied Voltage (V)",           "type": "number"},
          {"key": "measured_voltage", "title": "Measured Secondary Voltage (V)", "type": "number"},
          {"key": "theoretical_ratio","title": "Theoretical Ratio",             "type": "number"}
        ]
      }
    ]
  }'::jsonb
WHERE test_code = 'CVT_VRT' AND equipment_type = 'CVT';


-- CVT_POL: Polarity Test (3 cores)
UPDATE test_templates SET
  test_name = 'Polarity Test',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'CVT_POL' AND equipment_type = 'CVT';


-- CVT_SWR: was "Swept Wave Response" — now Secondary Winding Resistance (matches PDF)
UPDATE test_templates SET
  test_name = 'Secondary Winding Resistance Measurement',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'CVT_SWR' AND equipment_type = 'CVT';


-- CVT_IR: Insulation Resistance Measurement (10 fixed rows, R/Y/B columns)
UPDATE test_templates SET
  test_name = 'Insulation Resistance Measurement',
  tab = 'PARAMETERS',
  fields = '{
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
WHERE test_code = 'CVT_IR' AND equipment_type = 'CVT';


-- CVT_TD: Tan Delta and Capacitance Measurement (8-row dynamic table)
UPDATE test_templates SET
  test_name = 'Tan Delta and Capacitance Measurement',
  tab = 'PARAMETERS',
  fields = '{
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
WHERE test_code = 'CVT_TD' AND equipment_type = 'CVT';


-- CVT_CON: old "Capacitance Test" — superseded by CVT_TD; deactivate
UPDATE test_templates SET is_active = FALSE
WHERE test_code = 'CVT_CON' AND equipment_type = 'CVT';


-- =============================================================================
-- LA — Lightning Arrestor
-- =============================================================================

-- LA_IR: Insulation Resistance (6 stacks × R/Y/B)
UPDATE test_templates SET
  test_name = 'Insulation Resistance Measurement at 5000 V',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'LA_IR' AND equipment_type = 'LA';


-- LA_TD: Tan Delta and Capacitance (single-row dynamic, R-E / GST/UST / 10 kV)
UPDATE test_templates SET
  test_name = 'Tan Delta and Capacitance Measurement',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'LA_TD' AND equipment_type = 'LA';


-- LA_SCT: old "Surge Counter Test" — update to v2 matching Surge Counter Reading layout
UPDATE test_templates SET
  test_name = 'Surge Counter Reading',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'LA_SCT' AND equipment_type = 'LA';


-- LA_THRC: old "Thermal & High Rate Current" — update to v2 Third Harmonic layout
UPDATE test_templates SET
  test_name = 'Third Harmonic Resistive Current Measurement',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'LA_THRC' AND equipment_type = 'LA';


-- =============================================================================
-- ISOLATOR
-- =============================================================================

-- ISO_CRI: old "Contact Resistance Inspection" → Close Condition (R, R', Y, Y', B, B')
UPDATE test_templates SET
  test_name = 'Contact Resistance – Close Condition',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'ISO_CRI' AND equipment_type = 'ISOLATOR';


-- ISO_CRE: old "Contact Resistance External" → Open Condition (Earth Switch)
UPDATE test_templates SET
  test_name = 'Contact Resistance – Open Condition',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'ISO_CRE' AND equipment_type = 'ISOLATOR';


-- ISO_IR: Insulation Resistance at 5000 V (1 row: Main Contact to Ground)
UPDATE test_templates SET
  test_name = 'Insulation Resistance Measurement at 5000 V',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'ISO_IR' AND equipment_type = 'ISOLATOR';


-- =============================================================================
-- SF6_BREAKER
-- =============================================================================

-- SF6_TM: old "Timing Measurement" → Operating Time Table (36 rows)
UPDATE test_templates SET
  test_name = 'Operating Time Table',
  tab = 'PARAMETERS',
  fields = '{
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
          {"key": "close_ms",      "title": "Close (ms)",          "type": "number"},
          {"key": "open_trip1_ms", "title": "Open: Trip 1 (ms)",   "type": "number"},
          {"key": "open_trip2_ms", "title": "Open: Trip 2 (ms)",   "type": "number"},
          {"key": "co1_ms",        "title": "Close-Open: CO1 (ms)","type": "number"},
          {"key": "co2_ms",        "title": "CO2 (ms)",            "type": "number"}
        ]
      }
    ]
  }'::jsonb
WHERE test_code = 'SF6_TM' AND equipment_type = 'SF6_BREAKER';


-- SF6_CR: old "Contact Resistance" → Contact Resistance Measurement Table (12 rows)
UPDATE test_templates SET
  test_name = 'Contact Resistance Measurement',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'SF6_CR' AND equipment_type = 'SF6_BREAKER';


-- SF6_IRO: old "Insulation Resistance Open" → IR with Breaker Open (phase_rows)
UPDATE test_templates SET
  test_name = 'Insulation Resistance – Breaker Open',
  tab = 'PARAMETERS',
  fields = '{
    "version": 2,
    "sections": [
      {
        "id": "ir_open",
        "title": "Insulation Resistance with Breaker Open at 5000 Volts",
        "type": "phase_rows",
        "phases": ["R", "Y", "B"],
        "columns": [
          {"key": "break_1", "title": "Across Open Contact Break 1 (MΩ)", "type": "number"},
          {"key": "break_2", "title": "Break 2 (MΩ)",                     "type": "number"},
          {"key": "break_3", "title": "Break 3 (MΩ)",                     "type": "number"},
          {"key": "break_4", "title": "Break 4 (MΩ)",                     "type": "number"}
        ]
      }
    ]
  }'::jsonb
WHERE test_code = 'SF6_IRO' AND equipment_type = 'SF6_BREAKER';


-- SF6_IRC: old "Insulation Resistance Closed" → IR Breaker Closed (6 fixed points)
UPDATE test_templates SET
  test_name = 'Insulation Resistance – Breaker Closed',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'SF6_IRC' AND equipment_type = 'SF6_BREAKER';


-- SF6_CC: old "Coil Current" → Coil Characteristics Table (12 rows)
UPDATE test_templates SET
  test_name = 'Coil Characteristics Table',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'SF6_CC' AND equipment_type = 'SF6_BREAKER';


-- SF6_DCR: old "Dynamic Contact Resistance" → DCRM note + phase remarks table
UPDATE test_templates SET
  test_name = 'Dynamic Contact Resistance Measurement (DCRM)',
  tab = 'PARAMETERS',
  fields = '{
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
          {"key": "remarks",      "title": "Remarks",             "type": "string"},
          {"key": "witness_name", "title": "Witness Name & Sign", "type": "string"}
        ]
      }
    ]
  }'::jsonb
WHERE test_code = 'SF6_DCR' AND equipment_type = 'SF6_BREAKER';


-- SF6_DP: Dew Point of SF6 Gas (6 CB poles) — was blocked by ON CONFLICT
UPDATE test_templates SET
  test_name = 'Dew Point of SF6 Gas',
  tab = 'PARAMETERS',
  fields = '{
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
  }'::jsonb
WHERE test_code = 'SF6_DP' AND equipment_type = 'SF6_BREAKER';
