-- =============================================================================
-- Migration: Comprehensive OCT and PTR Test Templates (Version 2 Schema)
-- Description: Replaces flat property schemas for POWER_TRANSFORMER and CT
--              with a rich v2 schema that faithfully models:
--                • Outdoor Current Transformer (OCT) Test Report (all sections)
--                • Power Transformer (PTR) Test Report (all sections)
--
-- Schema version 2 introduces typed sections:
--   "fields"            – simple key/value form fields
--   "phase_columns"     – field rows with R/Y/B (or custom) phase columns
--   "phase_rows"        – R/Y/B rows with typed measurement columns
--   "tap_table"         – fixed rows keyed by tap number (1..N)
--   "dynamic_table"     – user-controlled row count
--   "core_table"        – rows keyed by core number (driven by num_cores field)
--   "core_phase_table"  – core rows × phase sub-columns (winding resistance matrix)
--   "phase_core_upload" – phase × core file-upload grid (CT Analyzer)
--   "ir_fixed"          – predefined IR measurement rows, 60s/600s/PI columns
--   "ir_fixed_phase"    – same but with per-phase (R/Y/B) value columns
-- =============================================================================


-- =============================================================================
-- POWER TRANSFORMER — add new templates (nameplate, short circuit, TDB)
-- =============================================================================

-- PTR Nameplate (new)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('POWER_TRANSFORMER', 'PT_NP', 'Equipment Nameplate Information', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "nameplate",
      "title": "Equipment Nameplate Information",
      "type": "fields",
      "fields": [
        {"key": "equipment_name",       "title": "Equipment Name",                      "type": "string", "required": true},
        {"key": "bay_location",         "title": "Equipment Designation (Bay Location)", "type": "string", "required": true},
        {"key": "serial_number",        "title": "Serial Number",                       "type": "string", "required": true},
        {"key": "transformer_type",     "title": "Transformer Type",                    "type": "enum",   "enum": ["Oil Type", "Dry Type"], "required": true},
        {"key": "manufacturer",         "title": "Manufacturer",                        "type": "string", "required": true},
        {"key": "rated_capacity",       "title": "Rated Capacity",                      "type": "number", "required": true},
        {"key": "rated_capacity_unit",  "title": "Capacity Unit",                       "type": "enum",   "enum": ["MVA", "KVA"], "default": "MVA"},
        {"key": "rated_voltage",        "title": "Rated Voltage",                       "type": "string", "required": true},
        {"key": "rated_frequency",      "title": "Rated Frequency (Hz)",                "type": "number"},
        {"key": "impedance_pct",        "title": "% Impedance",                         "type": "string"},
        {"key": "vector_group",         "title": "Vector Group",                        "type": "string"},
        {"key": "total_taps",           "title": "Total Taps",                          "type": "number", "default": 17},
        {"key": "normal_tap",           "title": "Normal Tap",                          "type": "string"},
        {"key": "cooling_type",         "title": "Cooling Type",                        "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- PTR Short Circuit Test (new)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('POWER_TRANSFORMER', 'PT_SCT', 'Short Circuit Test', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "short_circuit",
      "title": "Short Circuit Test",
      "note": "3-Ph supply Applied on HV side and LV side Shorted",
      "type": "dynamic_table",
      "row_prompt": "At how many taps is the test required to be done?",
      "default_rows": 1,
      "max_rows": 17,
      "columns": [
        {"key": "tap",     "title": "Tap (Editable)",   "type": "number"},
        {"key": "hv_r",    "title": "R-Ph HV (A)",      "type": "number"},
        {"key": "hv_y",    "title": "Y-Ph HV (A)",      "type": "number"},
        {"key": "hv_b",    "title": "B-Ph HV (A)",      "type": "number"},
        {"key": "lv_r",    "title": "r-ph LV (A)",      "type": "number"},
        {"key": "lv_y",    "title": "y-ph LV (A)",      "type": "number"},
        {"key": "lv_b",    "title": "b-ph LV (A)",      "type": "number"},
        {"key": "neutral", "title": "Neutral (A)",       "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- PTR Tan Delta of Bushings (new)
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('POWER_TRANSFORMER', 'PT_TDB', 'Tan Delta and Capacitance Measurement of Bushings', 'PARAMETERS', '{
  "version": 2,
  "sections": [
    {
      "id": "header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "ambient_temp", "title": "Ambient Temp (°C)", "type": "number", "required": true}
      ]
    },
    {
      "id": "bushing_details",
      "title": "Section 1 – Bushing Details (HV / LV)",
      "type": "phase_columns",
      "phases": ["R", "Y", "B", "N"],
      "fields": [
        {"key": "details", "title": "Details", "type": "string"},
        {"key": "make",    "title": "Make",    "type": "string"},
        {"key": "type",    "title": "Type",    "type": "string"},
        {"key": "sr_no",   "title": "Sr. No.", "type": "string"}
      ]
    },
    {
      "id": "td_bushings",
      "title": "Section 2 – Measurement Table",
      "type": "phase_rows",
      "phases": ["R", "Y", "B", "N"],
      "columns": [
        {"key": "insulation_tested", "title": "Insulation Tested", "type": "string"},
        {"key": "test_mode",         "title": "Test Mode",         "type": "string"},
        {"key": "test_kv",           "title": "Test kV",           "type": "number"},
        {"key": "capacitance",       "title": "Capacitance",       "type": "number"},
        {"key": "cap_unit",          "title": "Capacitance Unit",  "type": "enum", "enum": ["pF", "nF", "μF"]},
        {"key": "tan_delta_pct",     "title": "Tan Delta [%] Measured", "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- =============================================================================
-- POWER TRANSFORMER — upgrade existing templates to version 2 schema
-- =============================================================================

-- PT_VRT: Voltage Ratio Test — two sub-tables (HV side + LV side), 17 taps each
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "hv_side",
      "title": "Voltage Measured across HV Side",
      "note": "3-ph supply Applied on HV side and LV kept Open",
      "type": "tap_table",
      "tap_count_default": 17,
      "columns": [
        {"key": "ry", "title": "R-Y (V)", "type": "number"},
        {"key": "yb", "title": "Y-B (V)", "type": "number"},
        {"key": "br", "title": "B-R (V)", "type": "number"},
        {"key": "rn", "title": "R-N (V)", "type": "number"},
        {"key": "yn", "title": "Y-N (V)", "type": "number"},
        {"key": "bn", "title": "B-N (V)", "type": "number"}
      ]
    },
    {
      "id": "lv_side",
      "title": "Voltage measured across Phases on LV Side",
      "type": "tap_table",
      "tap_count_default": 17,
      "columns": [
        {"key": "ry", "title": "R-Y (V)", "type": "number"},
        {"key": "yb", "title": "Y-B (V)", "type": "number"},
        {"key": "br", "title": "B-R (V)", "type": "number"},
        {"key": "rn", "title": "R-N (V)", "type": "number"},
        {"key": "yn", "title": "Y-N (V)", "type": "number"},
        {"key": "bn", "title": "B-N (V)", "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_VRT';


-- PT_HVMC: HV Magnetizing Current Test — dynamic rows (Tap Number + 3-phase mA)
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "hv_mag",
      "title": "HV Magnetizing Current Test",
      "note": "3-ph supply Applied on HV side and LV kept Open",
      "type": "dynamic_table",
      "default_rows": 3,
      "columns": [
        {"key": "tap",  "title": "Tap Number", "type": "number"},
        {"key": "r_ma", "title": "R (mA)",     "type": "number"},
        {"key": "y_ma", "title": "Y (mA)",     "type": "number"},
        {"key": "b_ma", "title": "B (mA)",     "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_HVMC';


-- PT_LVMC: LV Magnetizing Current Test — dynamic rows (Tap + Applied Voltage + Measured Current)
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "lv_mag",
      "title": "LV Magnetizing Current Test",
      "note": "3-Ph Applied at L.V. Side and H.V. kept open",
      "type": "dynamic_table",
      "default_rows": 3,
      "columns": [
        {"key": "tap",      "title": "Tap",             "type": "number"},
        {"key": "v_ry",     "title": "V-ry (V)",        "type": "number"},
        {"key": "v_yb",     "title": "V-yb (V)",        "type": "number"},
        {"key": "v_br",     "title": "V-br (V)",        "type": "number"},
        {"key": "r_ph_ma",  "title": "r-Ph (mA)",       "type": "number"},
        {"key": "y_ph_ma",  "title": "y-Ph (mA)",       "type": "number"},
        {"key": "b_ph_ma",  "title": "b-Ph (mA)",       "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_LVMC';


-- PT_MBHV: Magnetic Balance – HV Side — user-defined tap count (default 1, max 17)
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "mb_hv",
      "title": "Magnetic Balance – HV Side",
      "note": "3-Ph Applied at HV Side and LV side open",
      "type": "dynamic_table",
      "row_prompt": "At how many taps is the test required to be done?",
      "default_rows": 1,
      "max_rows": 17,
      "columns": [
        {"key": "tap",    "title": "Tap (Editable)", "type": "number"},
        {"key": "hv_ry",  "title": "R-Y HV (V)",    "type": "number"},
        {"key": "hv_yb",  "title": "Y-B HV (V)",    "type": "number"},
        {"key": "hv_br",  "title": "B-R HV (V)",    "type": "number"},
        {"key": "lv_rn",  "title": "R-N LV (V)",    "type": "number"},
        {"key": "lv_yn",  "title": "Y-N LV (V)",    "type": "number"},
        {"key": "lv_bn",  "title": "B-N LV (V)",    "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_MBHV';


-- PT_MBLV: Magnetic Balance – LV Side — 3 rows (one per applied phase r-n, y-n, b-n)
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "mb_lv",
      "title": "Magnetic Balance – LV Side",
      "note": "1-ph applied at LV, and HV. kept open",
      "type": "dynamic_table",
      "default_rows": 3,
      "columns": [
        {"key": "tap",          "title": "Tap",                       "type": "number"},
        {"key": "v_applied_lv", "title": "Voltage Applied at LV (V)", "type": "number"},
        {"key": "v_rn",         "title": "V r-n (V)",                 "type": "number"},
        {"key": "v_yn",         "title": "V y-n (V)",                 "type": "number"},
        {"key": "v_bn",         "title": "V b-n (V)",                 "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_MBLV';


-- PT_WRHV: HV Winding Resistance — header fields + 17-tap table (UV/RN, VW/YN, WU/BN phases)
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "oti_temp", "title": "OTI Temp (°C)",              "type": "number"},
        {"key": "wti_temp", "title": "WTI Temp (20°C)",            "type": "number"},
        {"key": "unit",     "title": "Resistance Measurement Unit", "type": "enum", "enum": ["Ω", "mΩ", "μΩ"]}
      ]
    },
    {
      "id": "hv_winding",
      "title": "Transformer Winding Resistance Measurement (HV Winding)",
      "type": "tap_table",
      "tap_count_default": 17,
      "columns": [
        {"key": "uv_rn", "title": "UV / RN Phase", "type": "string"},
        {"key": "vw_yn", "title": "VW / YN Phase", "type": "string"},
        {"key": "wu_bn", "title": "WU / BN Phase", "type": "string"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_WRHV';


-- PT_WRLV: LV Winding Resistance — header + single-row table (rn, yn, bn phases)
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "oti_temp", "title": "OTI Temp (°C)",              "type": "number"},
        {"key": "wti_temp", "title": "WTI Temp (20°C)",            "type": "number"},
        {"key": "unit",     "title": "Resistance Measurement Unit", "type": "enum", "enum": ["Ω", "mΩ", "μΩ"]}
      ]
    },
    {
      "id": "lv_winding",
      "title": "Transformer Winding Resistance Measurement (LV Winding)",
      "type": "tap_table",
      "tap_count_default": 1,
      "columns": [
        {"key": "rn_phase", "title": "rn Phase", "type": "string"},
        {"key": "yn_phase", "title": "yn Phase", "type": "string"},
        {"key": "bn_phase", "title": "bn Phase", "type": "string"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_WRLV';


-- PT_TRT: Transformer Turns Ratio Test — 17-tap table with std. ratio, measured RY/YB/BR, deviation %
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "turns_ratio",
      "title": "Transformer Turns Ratio Test",
      "type": "tap_table",
      "tap_count_default": 17,
      "columns": [
        {"key": "std_ratio",     "title": "Std. Ratio",    "type": "string"},
        {"key": "measured_ry",   "title": "Measured RY",   "type": "number"},
        {"key": "measured_yb",   "title": "Measured YB",   "type": "number"},
        {"key": "measured_br",   "title": "Measured BR",   "type": "number"},
        {"key": "dev_ry",        "title": "% Dev RY",      "type": "number"},
        {"key": "dev_yb",        "title": "% Dev YB",      "type": "number"},
        {"key": "dev_br",        "title": "% Dev BR",      "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_TRT';


-- PT_IR: Insulation Resistance — dropdown unit + 8 fixed rows with 60s/600s/PI columns
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "unit", "title": "Resistance Measurement Unit", "type": "enum", "enum": ["MΩ", "GΩ", "TΩ"], "required": true}
      ]
    },
    {
      "id": "ir_table",
      "title": "Transformer Insulation Resistance Measurement",
      "type": "ir_fixed",
      "rows": [
        {"id": "hv_lv_1", "label": "HV-LV-1", "parameter": "HV/LV"},
        {"id": "hv_lv_2", "label": "HV-LV-2", "parameter": "HV/LV"},
        {"id": "hv_lv_3", "label": "HV-LV-3", "parameter": "HV/LV"},
        {"id": "hv_lv_4", "label": "HV-LV-4", "parameter": "HV/LV"},
        {"id": "lv_1_g",  "label": "LV-1-G",  "parameter": "LV/E"},
        {"id": "lv_2_g",  "label": "LV-2-G",  "parameter": "LV/E"},
        {"id": "lv_3_g",  "label": "LV-3-G",  "parameter": "LV/E"},
        {"id": "lv_4_g",  "label": "LV-4-G",  "parameter": "LV/E"}
      ],
      "columns": [
        {"key": "val_60s",  "title": "60 Sec",      "type": "number"},
        {"key": "val_600s", "title": "600 Sec",     "type": "number"},
        {"key": "pi",       "title": "PI (600/60)", "type": "number", "calculated": true, "formula": "val_600s / val_60s"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_IR';


-- PT_TDW: Tan Delta Windings — ambient temp + dynamic table (primary template)
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "ambient_temp", "title": "Ambient Temp (°C)", "type": "number", "required": true}
      ]
    },
    {
      "id": "td_windings",
      "title": "Tan Delta and Capacitance Measurement of Windings",
      "type": "dynamic_table",
      "default_rows": 5,
      "columns": [
        {"key": "insulation_tested", "title": "Insulation Tested",  "type": "string"},
        {"key": "test_mode",         "title": "Test Mode",          "type": "string"},
        {"key": "test_kv",           "title": "Test kV",            "type": "number"},
        {"key": "capacitance",       "title": "Capacitance",        "type": "number"},
        {"key": "cap_unit",          "title": "Capacitance Unit",   "type": "enum", "enum": ["pF", "nF", "μF"]},
        {"key": "tan_delta_pct",     "title": "Tan Delta [%]",      "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_TDW';


-- PT_TDHV: Tan Delta HV Bushings — same structure as TDW (now bushing-specific)
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "ambient_temp", "title": "Ambient Temp (°C)", "type": "number", "required": true}
      ]
    },
    {
      "id": "td_hv",
      "title": "Tan Delta and Capacitance Measurement of HV Bushings",
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "insulation_tested", "title": "Insulation Tested",  "type": "string"},
        {"key": "test_mode",         "title": "Test Mode",          "type": "string"},
        {"key": "test_kv",           "title": "Test kV",            "type": "number"},
        {"key": "capacitance",       "title": "Capacitance",        "type": "number"},
        {"key": "cap_unit",          "title": "Capacitance Unit",   "type": "enum", "enum": ["pF", "nF", "μF"]},
        {"key": "tan_delta_pct",     "title": "Tan Delta [%]",      "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_TDHV';


-- PT_TDLV: Tan Delta LV Bushings — same structure
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "ambient_temp", "title": "Ambient Temp (°C)", "type": "number", "required": true}
      ]
    },
    {
      "id": "td_lv",
      "title": "Tan Delta and Capacitance Measurement of LV Bushings",
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "insulation_tested", "title": "Insulation Tested",  "type": "string"},
        {"key": "test_mode",         "title": "Test Mode",          "type": "string"},
        {"key": "test_kv",           "title": "Test kV",            "type": "number"},
        {"key": "capacitance",       "title": "Capacitance",        "type": "number"},
        {"key": "cap_unit",          "title": "Capacitance Unit",   "type": "enum", "enum": ["pF", "nF", "μF"]},
        {"key": "tan_delta_pct",     "title": "Tan Delta [%]",      "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'POWER_TRANSFORMER' AND test_code = 'PT_TDLV';


-- =============================================================================
-- CURRENT TRANSFORMER (CT) — add new templates (nameplate, core details, site info)
-- =============================================================================

-- CT Nameplate: per-phase (R, Y, B) equipment details
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CT', 'CT_NP', 'Equipment Nameplate Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "equipment_details",
      "title": "Equipment Details",
      "type": "phase_columns",
      "phases": ["R", "Y", "B"],
      "fields": [
        {"key": "location",              "title": "Equipment Location / Bay",  "type": "string"},
        {"key": "phase",                 "title": "Phase",                     "type": "string"},
        {"key": "serial_number",         "title": "Serial Number",             "type": "string", "required": true},
        {"key": "manufacturer",          "title": "Manufacturer",              "type": "string"},
        {"key": "year_of_manufacture",   "title": "Year of Manufacture",       "type": "string"},
        {"key": "ct_type",               "title": "Type",                      "type": "string"},
        {"key": "rated_primary_voltage", "title": "Rated Primary Voltage",     "type": "string"},
        {"key": "rated_frequency",       "title": "Rated Frequency",           "type": "string"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- CT Core Details: configurable number of cores (1-4) with electrical parameters per core
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CT', 'CT_CORE', 'Core Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "core_count_header",
      "title": "Core Details",
      "type": "fields",
      "fields": [
        {"key": "num_cores", "title": "Number of Cores", "type": "enum", "enum": ["1", "2", "3", "4"], "default": "4", "required": true}
      ]
    },
    {
      "id": "core_table",
      "title": "Core Specifications",
      "note": "Fill data for each core present on this CT unit.",
      "type": "core_table",
      "num_cores_from_field": "num_cores",
      "num_cores_default": 4,
      "columns": [
        {"key": "ct_type",   "title": "CT Type",     "type": "enum", "enum": ["Protection", "Measurement", "Protection & Measurement"]},
        {"key": "ratio",     "title": "Ratio",       "type": "string"},
        {"key": "class",     "title": "Class",       "type": "string"},
        {"key": "burden_va", "title": "Burden (VA)", "type": "number"},
        {"key": "rct_ohm",   "title": "Rct (Ohms)",  "type": "number"},
        {"key": "vk_volts",  "title": "Vk (Volts)", "type": "number"},
        {"key": "imag",      "title": "Imag",        "type": "number"}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- CT Site Testing Info: site details, customer, location, and testing method selection
INSERT INTO test_templates (equipment_type, test_code, test_name, tab, fields, is_active)
VALUES ('CT', 'CT_SITE', 'Site Testing and Customer Details', 'NAMEPLATE', '{
  "version": 2,
  "sections": [
    {
      "id": "site_testing",
      "title": "Site Testing Details",
      "type": "fields",
      "fields": [
        {"key": "date_site_reporting", "title": "Date of Site Reporting",    "type": "date"},
        {"key": "date_testing",        "title": "Date of Testing",           "type": "date"},
        {"key": "ambient_temp",        "title": "Ambient Temperature (°C)",  "type": "number"},
        {"key": "testing_done_by",     "title": "Testing Done by",           "type": "string"}
      ]
    },
    {
      "id": "customer",
      "title": "Customer Details",
      "type": "fields",
      "fields": [
        {"key": "end_customer",      "title": "End Customer",        "type": "string"},
        {"key": "client_contractor", "title": "Client / Contractor", "type": "string"},
        {"key": "test_witnessed_by", "title": "Test Witnessed by",   "type": "string"}
      ]
    },
    {
      "id": "location",
      "title": "Site Location Details",
      "type": "fields",
      "fields": [
        {"key": "project_name",     "title": "Name of the Project", "type": "string"},
        {"key": "location_address", "title": "Location-Address",    "type": "string"}
      ]
    },
    {
      "id": "method",
      "title": "Testing Method Selection",
      "type": "fields",
      "fields": [
        {"key": "testing_method", "title": "Select Testing Method", "type": "enum",
         "enum": ["CT Testing by CT Analyzer", "CT Testing by Manual Injection Method"],
         "required": true}
      ]
    }
  ]
}'::jsonb, TRUE)
ON CONFLICT (equipment_type, test_code) DO NOTHING;


-- =============================================================================
-- CURRENT TRANSFORMER — upgrade existing templates to version 2 schema
-- =============================================================================

-- CT_ANALYZER: CT Analyzer method — phase × core PDF upload grid + IEC 61869-2 note
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "method_note",
      "title": "CT Testing by CT Analyzer",
      "note": "Current Transformer Testing is performed according to IEC 61869-2. System generated reports from the testing equipment for each phase and each core shall be submitted. Tests performed: (1) Ratio and phase accuracy  (2) Winding resistance  (3) Excitation characteristics / knee points  (4) Burden impedance.",
      "type": "fields",
      "fields": []
    },
    {
      "id": "upload_section",
      "title": "CT Analyzer Upload Section",
      "type": "phase_core_upload",
      "phases": ["R", "Y", "B"],
      "cores": ["Core 1", "Core 2", "Core 3", "Core 4"]
    }
  ]
}'::jsonb WHERE equipment_type = 'CT' AND test_code = 'CT_ANALYZER';


-- CT_WRM: Winding Resistance Measurement & Polarity Check
-- Matrix: core winding (rows) × phase (R/Y/B columns), each cell has resistance + polarity
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "winding_polarity",
      "title": "Winding Resistance Measurement & Polarity Check",
      "note": "Each phase (R, Y, B) is tested sequentially; only active phase data is filled in its section.",
      "type": "core_phase_table",
      "cores": ["1S1 – 1S2", "2S1 – 2S2", "3S1 – 3S2", "4S1 – 4S2"],
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "resistance_ohm", "title": "Secondary Winding Resistance (Ω)", "type": "number"},
        {"key": "polarity",       "title": "Polarity",                          "type": "enum", "enum": ["Correct", "Reverse"]}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'CT' AND test_code = 'CT_WRM';


-- CT_POL: Polarity Check (kept for backward compatibility with existing test_tasks,
--         but polarity is now also captured in CT_WRM above)
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "polarity",
      "title": "Polarity Check",
      "note": "Verify polarity for each core. Detailed polarity data is also captured in the Winding Resistance test (CT_WRM).",
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "core_1", "title": "Core 1 (1S1-1S2)", "type": "enum", "enum": ["Correct", "Reverse"]},
        {"key": "core_2", "title": "Core 2 (2S1-2S2)", "type": "enum", "enum": ["Correct", "Reverse"]},
        {"key": "core_3", "title": "Core 3 (3S1-3S2)", "type": "enum", "enum": ["Correct", "Reverse"]},
        {"key": "core_4", "title": "Core 4 (4S1-4S2)", "type": "enum", "enum": ["Correct", "Reverse"]}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'CT' AND test_code = 'CT_POL';


-- CT_CRI: Current Ratio by Primary Injection Method — 3 sections (one per phase R/Y/B)
-- Each section: dynamic rows of Applied Primary Current vs 4 core readings
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "cri_note",
      "title": "Current Ratio by Primary Injection Method",
      "note": "Current is injected by Primary Injection Current Equipment and current is measured at the secondary box.",
      "type": "fields",
      "fields": []
    },
    {
      "id": "phase_r",
      "title": "Phase R",
      "type": "dynamic_table",
      "default_rows": 3,
      "columns": [
        {"key": "primary_current", "title": "Applied Primary Current (Amps)", "type": "number"},
        {"key": "core_1s1_1s2",    "title": "1S1 – 1S2",                     "type": "number"},
        {"key": "core_2s1_2s2",    "title": "2S1 – 2S2",                     "type": "number"},
        {"key": "core_3s1_3s2",    "title": "3S1 – 3S2",                     "type": "number"},
        {"key": "core_4s1_4s2",    "title": "4S1 – 4S2",                     "type": "number"}
      ]
    },
    {
      "id": "phase_y",
      "title": "Phase Y",
      "type": "dynamic_table",
      "default_rows": 3,
      "columns": [
        {"key": "primary_current", "title": "Applied Primary Current (Amps)", "type": "number"},
        {"key": "core_1s1_1s2",    "title": "1S1 – 1S2",                     "type": "number"},
        {"key": "core_2s1_2s2",    "title": "2S1 – 2S2",                     "type": "number"},
        {"key": "core_3s1_3s2",    "title": "3S1 – 3S2",                     "type": "number"},
        {"key": "core_4s1_4s2",    "title": "4S1 – 4S2",                     "type": "number"}
      ]
    },
    {
      "id": "phase_b",
      "title": "Phase B",
      "type": "dynamic_table",
      "default_rows": 3,
      "columns": [
        {"key": "primary_current", "title": "Applied Primary Current (Amps)", "type": "number"},
        {"key": "core_1s1_1s2",    "title": "1S1 – 1S2",                     "type": "number"},
        {"key": "core_2s1_2s2",    "title": "2S1 – 2S2",                     "type": "number"},
        {"key": "core_3s1_3s2",    "title": "3S1 – 3S2",                     "type": "number"},
        {"key": "core_4s1_4s2",    "title": "4S1 – 4S2",                     "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'CT' AND test_code = 'CT_CRI';


-- CT_TD: Tan Delta and Capacitance Measurement — ambient temp header + 3-phase rows
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "header",
      "title": "",
      "type": "fields",
      "fields": [
        {"key": "ambient_temp", "title": "Ambient Temp (°C)", "type": "number", "required": true}
      ]
    },
    {
      "id": "tan_delta_phase",
      "title": "Tan Delta and Capacitance Measurement of Windings",
      "type": "phase_rows",
      "phases": ["R", "Y", "B"],
      "columns": [
        {"key": "test_mode",     "title": "Test Mode",     "type": "string"},
        {"key": "test_kv",       "title": "Test kV",       "type": "number"},
        {"key": "capacitance",   "title": "Capacitance",   "type": "number"},
        {"key": "tan_delta_pct", "title": "Tan Delta [%]", "type": "number"}
      ]
    }
  ]
}'::jsonb WHERE equipment_type = 'CT' AND test_code = 'CT_TD';


-- CT_IR: Insulation Resistance Measurement
-- 15 predefined test pairs (Primary-Earth, Primary-Core1..4, Core1-Earth..Core4-Earth,
-- Core1-Core2 through Core3-Core4), each measured per phase R/Y/B
UPDATE test_templates SET fields = '{
  "version": 2,
  "sections": [
    {
      "id": "ir_phase",
      "title": "Insulation Resistance Measurement",
      "type": "ir_fixed_phase",
      "phases": ["R", "Y", "B"],
      "rows": [
        {"id": "1",  "sr": "1",  "insulation": "Primary – Earth",   "voltage": "5 kV",  "unit": "MΩ"},
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
}'::jsonb WHERE equipment_type = 'CT' AND test_code = 'CT_IR';


-- =============================================================================
-- Summary of section types introduced (for frontend renderer reference):
--
--  fields           → simple key/value form, renders as labeled inputs
--  phase_columns    → fields as rows, R/Y/B (or custom phases) as columns
--  phase_rows       → R/Y/B (or custom) as rows, typed columns per row
--  tap_table        → fixed rows 1..tap_count_default; row label = Tap No.
--  dynamic_table    → user controls row count via "+/–" buttons
--  core_table       → fixed rows 1..num_cores_default; row label = Core No.
--  core_phase_table → rows = cores (1S1-1S2 etc.), columns grouped by phase
--  phase_core_upload→ phase × core grid of file-upload inputs (PDF attachments)
--  ir_fixed         → rows from "rows" array; columns = val_60s, val_600s, pi
--  ir_fixed_phase   → rows from "rows" array; per-phase (R/Y/B) value columns
-- =============================================================================
