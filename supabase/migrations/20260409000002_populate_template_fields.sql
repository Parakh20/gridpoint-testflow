-- Migration: Populate test_templates.fields with proper JSON Schema definitions
-- Each template gets measurement fields appropriate for that electrical test type.
-- Field types: number, string, string+enum (rendered as select in the dynamic form).

-- ═══════════════════════════════════════════════════════════
-- POWER_TRANSFORMER
-- ═══════════════════════════════════════════════════════════

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "hv_voltage_kv":    {"type": "number", "title": "HV Voltage (kV)"},
    "lv_voltage_kv":    {"type": "number", "title": "LV Voltage (kV)"},
    "ratio_measured":   {"type": "number", "title": "Measured Ratio"},
    "ratio_nameplate":  {"type": "number", "title": "Nameplate Ratio"},
    "deviation_pct":    {"type": "number", "title": "Deviation (%)"}
  },
  "required": ["hv_voltage_kv","lv_voltage_kv","ratio_measured","deviation_pct"]
}'::jsonb WHERE test_code = 'PT_VRT';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_ma":       {"type": "number", "title": "Phase A (mA)"},
    "phase_b_ma":       {"type": "number", "title": "Phase B (mA)"},
    "phase_c_ma":       {"type": "number", "title": "Phase C (mA)"},
    "test_voltage_kv":  {"type": "number", "title": "Test Voltage (kV)"}
  },
  "required": ["phase_a_ma","phase_b_ma","phase_c_ma"]
}'::jsonb WHERE test_code = 'PT_HVMC';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_ma":       {"type": "number", "title": "Phase A (mA)"},
    "phase_b_ma":       {"type": "number", "title": "Phase B (mA)"},
    "phase_c_ma":       {"type": "number", "title": "Phase C (mA)"},
    "test_voltage_kv":  {"type": "number", "title": "Test Voltage (kV)"}
  },
  "required": ["phase_a_ma","phase_b_ma","phase_c_ma"]
}'::jsonb WHERE test_code = 'PT_LVMC';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "v12_v": {"type": "number", "title": "V1-2 (V)"},
    "v23_v": {"type": "number", "title": "V2-3 (V)"},
    "v31_v": {"type": "number", "title": "V3-1 (V)"}
  },
  "required": ["v12_v","v23_v","v31_v"]
}'::jsonb WHERE test_code = 'PT_MBHV';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "v12_v": {"type": "number", "title": "V1-2 (V)"},
    "v23_v": {"type": "number", "title": "V2-3 (V)"},
    "v31_v": {"type": "number", "title": "V3-1 (V)"}
  },
  "required": ["v12_v","v23_v","v31_v"]
}'::jsonb WHERE test_code = 'PT_MBLV';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_mohm":    {"type": "number", "title": "Phase A (mΩ)"},
    "phase_b_mohm":    {"type": "number", "title": "Phase B (mΩ)"},
    "phase_c_mohm":    {"type": "number", "title": "Phase C (mΩ)"},
    "temperature_c":   {"type": "number", "title": "Temperature (°C)"}
  },
  "required": ["phase_a_mohm","phase_b_mohm","phase_c_mohm"]
}'::jsonb WHERE test_code = 'PT_WRHV';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_mohm":    {"type": "number", "title": "Phase A (mΩ)"},
    "phase_b_mohm":    {"type": "number", "title": "Phase B (mΩ)"},
    "phase_c_mohm":    {"type": "number", "title": "Phase C (mΩ)"},
    "temperature_c":   {"type": "number", "title": "Temperature (°C)"}
  },
  "required": ["phase_a_mohm","phase_b_mohm","phase_c_mohm"]
}'::jsonb WHERE test_code = 'PT_WRLV';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_ratio":     {"type": "number", "title": "Phase A Ratio"},
    "phase_b_ratio":     {"type": "number", "title": "Phase B Ratio"},
    "phase_c_ratio":     {"type": "number", "title": "Phase C Ratio"},
    "calculated_ratio":  {"type": "number", "title": "Calculated Ratio"},
    "deviation_pct":     {"type": "number", "title": "Max Deviation (%)"}
  },
  "required": ["phase_a_ratio","phase_b_ratio","phase_c_ratio","deviation_pct"]
}'::jsonb WHERE test_code = 'PT_TRT';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "capacitance_pf":   {"type": "number", "title": "Capacitance (pF)"},
    "tan_delta_pct":    {"type": "number", "title": "Tan Delta (%)"},
    "test_voltage_kv":  {"type": "number", "title": "Test Voltage (kV)"},
    "temperature_c":    {"type": "number", "title": "Temperature (°C)"}
  },
  "required": ["capacitance_pf","tan_delta_pct","test_voltage_kv"]
}'::jsonb WHERE test_code = 'PT_TDHV';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "capacitance_pf":   {"type": "number", "title": "Capacitance (pF)"},
    "tan_delta_pct":    {"type": "number", "title": "Tan Delta (%)"},
    "test_voltage_kv":  {"type": "number", "title": "Test Voltage (kV)"},
    "temperature_c":    {"type": "number", "title": "Temperature (°C)"}
  },
  "required": ["capacitance_pf","tan_delta_pct","test_voltage_kv"]
}'::jsonb WHERE test_code = 'PT_TDLV';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "capacitance_pf":   {"type": "number", "title": "Capacitance (pF)"},
    "tan_delta_pct":    {"type": "number", "title": "Tan Delta (%)"},
    "test_voltage_kv":  {"type": "number", "title": "Test Voltage (kV)"},
    "temperature_c":    {"type": "number", "title": "Temperature (°C)"}
  },
  "required": ["capacitance_pf","tan_delta_pct","test_voltage_kv"]
}'::jsonb WHERE test_code = 'PT_TDW';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "hv_lv_mohm":       {"type": "number", "title": "HV-LV (MΩ)"},
    "hv_earth_mohm":    {"type": "number", "title": "HV-Earth (MΩ)"},
    "lv_earth_mohm":    {"type": "number", "title": "LV-Earth (MΩ)"},
    "pi_ratio":         {"type": "number", "title": "Polarisation Index"},
    "test_voltage_v":   {"type": "number", "title": "Test Voltage (V)"},
    "temperature_c":    {"type": "number", "title": "Temperature (°C)"}
  },
  "required": ["hv_lv_mohm","hv_earth_mohm","lv_earth_mohm"]
}'::jsonb WHERE test_code = 'PT_IR';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "frequency_start_hz": {"type": "number", "title": "Start Frequency (Hz)"},
    "frequency_end_hz":   {"type": "number", "title": "End Frequency (Hz)"},
    "test_result":        {"type": "string", "title": "Assessment", "enum": ["NORMAL","SUSPECT","ABNORMAL"]},
    "reference_basis":    {"type": "string", "title": "Reference Basis", "enum": ["BASELINE","FACTORY","SISTER_UNIT"]}
  },
  "required": ["test_result"]
}'::jsonb WHERE test_code = 'PT-007';

-- ═══════════════════════════════════════════════════════════
-- CT (Current Transformer)
-- ═══════════════════════════════════════════════════════════

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "ratio_error_pct":        {"type": "number", "title": "Ratio Error (%)"},
    "phase_displacement_min": {"type": "number", "title": "Phase Displacement (min)"},
    "magnetizing_current_ma": {"type": "number", "title": "Magnetising Current (mA)"},
    "composite_error_pct":    {"type": "number", "title": "Composite Error (%)"},
    "accuracy_class":         {"type": "string", "title": "Accuracy Class", "enum": ["0.1","0.2","0.5","1","3","5","5P","10P"]}
  },
  "required": ["ratio_error_pct","phase_displacement_min"]
}'::jsonb WHERE test_code = 'CT_ANALYZER';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "primary_winding_mohm":   {"type": "number", "title": "Primary Winding (mΩ)"},
    "secondary_winding_mohm": {"type": "number", "title": "Secondary Winding (mΩ)"},
    "temperature_c":          {"type": "number", "title": "Temperature (°C)"}
  },
  "required": ["primary_winding_mohm","secondary_winding_mohm"]
}'::jsonb WHERE test_code = 'CT_WRM';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "polarity_result": {"type": "string", "title": "Polarity Result", "enum": ["CORRECT","REVERSE"]},
    "test_method":     {"type": "string", "title": "Test Method", "enum": ["BATTERY","SECONDARY_INJECTION"]}
  },
  "required": ["polarity_result"]
}'::jsonb WHERE test_code = 'CT_POL';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "nameplate_ratio":        {"type": "string", "title": "Nameplate Ratio"},
    "measured_ratio":         {"type": "number", "title": "Measured Ratio"},
    "ratio_error_pct":        {"type": "number", "title": "Ratio Error (%)"},
    "phase_displacement_min": {"type": "number", "title": "Phase Displacement (min)"}
  },
  "required": ["measured_ratio","ratio_error_pct"]
}'::jsonb WHERE test_code = 'CT_CRI';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "capacitance_pf":  {"type": "number", "title": "Capacitance (pF)"},
    "tan_delta_pct":   {"type": "number", "title": "Tan Delta (%)"},
    "test_voltage_kv": {"type": "number", "title": "Test Voltage (kV)"}
  },
  "required": ["capacitance_pf","tan_delta_pct","test_voltage_kv"]
}'::jsonb WHERE test_code = 'CT_TD';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "primary_secondary_mohm": {"type": "number", "title": "Primary-Secondary (MΩ)"},
    "primary_earth_mohm":     {"type": "number", "title": "Primary-Earth (MΩ)"},
    "secondary_earth_mohm":   {"type": "number", "title": "Secondary-Earth (MΩ)"},
    "test_voltage_v":         {"type": "number", "title": "Test Voltage (V)"}
  },
  "required": ["primary_secondary_mohm","primary_earth_mohm","secondary_earth_mohm"]
}'::jsonb WHERE test_code = 'CT_IR';

-- ═══════════════════════════════════════════════════════════
-- CVT (Capacitor Voltage Transformer)
-- ═══════════════════════════════════════════════════════════

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "primary_voltage_kv":  {"type": "number", "title": "Primary Voltage (kV)"},
    "secondary_voltage_v": {"type": "number", "title": "Secondary Voltage (V)"},
    "ratio_measured":      {"type": "number", "title": "Measured Ratio"},
    "ratio_nameplate":     {"type": "number", "title": "Nameplate Ratio"},
    "deviation_pct":       {"type": "number", "title": "Deviation (%)"}
  },
  "required": ["primary_voltage_kv","secondary_voltage_v","ratio_measured","deviation_pct"]
}'::jsonb WHERE test_code = 'CVT_VRT';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "polarity_result": {"type": "string", "title": "Polarity Result", "enum": ["CORRECT","REVERSE"]}
  },
  "required": ["polarity_result"]
}'::jsonb WHERE test_code = 'CVT_POL';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "frequency_start_hz":    {"type": "number", "title": "Start Frequency (Hz)"},
    "frequency_end_hz":      {"type": "number", "title": "End Frequency (Hz)"},
    "resonance_freq_hz":     {"type": "number", "title": "Resonance Frequency (Hz)"},
    "attenuation_db":        {"type": "number", "title": "Attenuation (dB)"}
  },
  "required": ["resonance_freq_hz"]
}'::jsonb WHERE test_code = 'CVT_SWR';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "c1_pf":               {"type": "number", "title": "C1 (pF)"},
    "c2_pf":               {"type": "number", "title": "C2 (pF)"},
    "total_capacitance_pf":{"type": "number", "title": "Total Capacitance (pF)"},
    "test_voltage_kv":     {"type": "number", "title": "Test Voltage (kV)"}
  },
  "required": ["c1_pf","c2_pf"]
}'::jsonb WHERE test_code = 'CVT_CON';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "c1_capacitance_pf":  {"type": "number", "title": "C1 Capacitance (pF)"},
    "c1_tan_delta_pct":   {"type": "number", "title": "C1 Tan Delta (%)"},
    "c2_capacitance_pf":  {"type": "number", "title": "C2 Capacitance (pF)"},
    "c2_tan_delta_pct":   {"type": "number", "title": "C2 Tan Delta (%)"},
    "test_voltage_kv":    {"type": "number", "title": "Test Voltage (kV)"}
  },
  "required": ["c1_tan_delta_pct","c2_tan_delta_pct","test_voltage_kv"]
}'::jsonb WHERE test_code = 'CVT_TD';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "primary_earth_mohm":   {"type": "number", "title": "Primary-Earth (MΩ)"},
    "secondary_earth_mohm": {"type": "number", "title": "Secondary-Earth (MΩ)"},
    "test_voltage_v":       {"type": "number", "title": "Test Voltage (V)"}
  },
  "required": ["primary_earth_mohm","secondary_earth_mohm"]
}'::jsonb WHERE test_code = 'CVT_IR';

-- ═══════════════════════════════════════════════════════════
-- LA (Lightning Arrester)
-- ═══════════════════════════════════════════════════════════

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "counter_reading":     {"type": "number", "title": "Counter Reading"},
    "surge_count":         {"type": "number", "title": "Surge Count"},
    "counter_functional":  {"type": "string", "title": "Counter Functional", "enum": ["YES","NO"]}
  },
  "required": ["counter_functional"]
}'::jsonb WHERE test_code = 'LA_SCT';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "leakage_current_ma":     {"type": "number", "title": "Total Leakage Current (mA)"},
    "resistive_component_ma": {"type": "number", "title": "Resistive Component (mA)"},
    "test_voltage_kv":        {"type": "number", "title": "Test Voltage (kV)"},
    "temperature_c":          {"type": "number", "title": "Temperature (°C)"}
  },
  "required": ["leakage_current_ma","resistive_component_ma","test_voltage_kv"]
}'::jsonb WHERE test_code = 'LA_THRC';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "tan_delta_pct":   {"type": "number", "title": "Tan Delta (%)"},
    "capacitance_pf":  {"type": "number", "title": "Capacitance (pF)"},
    "test_voltage_kv": {"type": "number", "title": "Test Voltage (kV)"}
  },
  "required": ["tan_delta_pct","capacitance_pf","test_voltage_kv"]
}'::jsonb WHERE test_code = 'LA_TD';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "insulation_resistance_mohm": {"type": "number", "title": "Insulation Resistance (MΩ)"},
    "test_voltage_v":             {"type": "number", "title": "Test Voltage (V)"}
  },
  "required": ["insulation_resistance_mohm","test_voltage_v"]
}'::jsonb WHERE test_code = 'LA_IR';

-- ═══════════════════════════════════════════════════════════
-- SF6_BREAKER
-- ═══════════════════════════════════════════════════════════

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "close_time_ms":    {"type": "number", "title": "Close Time (ms)"},
    "open_time_ms":     {"type": "number", "title": "Open Time (ms)"},
    "co_time_ms":       {"type": "number", "title": "C-O Time (ms)"},
    "reclose_time_ms":  {"type": "number", "title": "Reclose Time (ms)"},
    "operating_voltage_v": {"type": "number", "title": "Operating Voltage (V)"}
  },
  "required": ["close_time_ms","open_time_ms"]
}'::jsonb WHERE test_code = 'SF6_TM';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_uohm":    {"type": "number", "title": "Phase A (μΩ)"},
    "phase_b_uohm":    {"type": "number", "title": "Phase B (μΩ)"},
    "phase_c_uohm":    {"type": "number", "title": "Phase C (μΩ)"},
    "test_current_a":  {"type": "number", "title": "Test Current (A)"}
  },
  "required": ["phase_a_uohm","phase_b_uohm","phase_c_uohm","test_current_a"]
}'::jsonb WHERE test_code = 'SF6_CR';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "close_coil_peak_a":  {"type": "number", "title": "Close Coil Peak (A)"},
    "open_coil_1_peak_a": {"type": "number", "title": "Open Coil 1 Peak (A)"},
    "open_coil_2_peak_a": {"type": "number", "title": "Open Coil 2 Peak (A)"},
    "operating_voltage_v":{"type": "number", "title": "Operating Voltage (V)"}
  },
  "required": ["close_coil_peak_a","open_coil_1_peak_a"]
}'::jsonb WHERE test_code = 'SF6_CC';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "min_resistance_uohm":  {"type": "number", "title": "Min Resistance (μΩ)"},
    "max_resistance_uohm":  {"type": "number", "title": "Max Resistance (μΩ)"},
    "wipe_distance_mm":     {"type": "number", "title": "Wipe Distance (mm)"},
    "contact_velocity_ms":  {"type": "number", "title": "Contact Velocity (m/s)"}
  },
  "required": ["min_resistance_uohm","max_resistance_uohm"]
}'::jsonb WHERE test_code = 'SF6_DCR';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "sf6_pressure_bar":    {"type": "number", "title": "SF6 Pressure (bar)"},
    "temperature_c":       {"type": "number", "title": "Ambient Temperature (°C)"},
    "density_20c_bar":     {"type": "number", "title": "Density at 20°C (bar)"},
    "alarm_pressure_bar":  {"type": "number", "title": "Alarm Pressure Setting (bar)"}
  },
  "required": ["sf6_pressure_bar","temperature_c"]
}'::jsonb WHERE test_code = 'SF6_DP';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_mohm":   {"type": "number", "title": "Phase A (MΩ)"},
    "phase_b_mohm":   {"type": "number", "title": "Phase B (MΩ)"},
    "phase_c_mohm":   {"type": "number", "title": "Phase C (MΩ)"},
    "test_voltage_v": {"type": "number", "title": "Test Voltage (V)"}
  },
  "required": ["phase_a_mohm","phase_b_mohm","phase_c_mohm","test_voltage_v"]
}'::jsonb WHERE test_code = 'SF6_IRO';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_mohm":   {"type": "number", "title": "Phase A (MΩ)"},
    "phase_b_mohm":   {"type": "number", "title": "Phase B (MΩ)"},
    "phase_c_mohm":   {"type": "number", "title": "Phase C (MΩ)"},
    "test_voltage_v": {"type": "number", "title": "Test Voltage (V)"}
  },
  "required": ["phase_a_mohm","phase_b_mohm","phase_c_mohm","test_voltage_v"]
}'::jsonb WHERE test_code = 'SF6_IRC';

-- ═══════════════════════════════════════════════════════════
-- ISOLATOR
-- ═══════════════════════════════════════════════════════════

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "contact_resistance_uohm": {"type": "number", "title": "Contact Resistance (μΩ)"},
    "test_current_a":          {"type": "number", "title": "Test Current (A)"}
  },
  "required": ["contact_resistance_uohm","test_current_a"]
}'::jsonb WHERE test_code = 'ISO_CRI';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_uohm":  {"type": "number", "title": "Phase A (μΩ)"},
    "phase_b_uohm":  {"type": "number", "title": "Phase B (μΩ)"},
    "phase_c_uohm":  {"type": "number", "title": "Phase C (μΩ)"},
    "test_current_a":{"type": "number", "title": "Test Current (A)"}
  },
  "required": ["phase_a_uohm","phase_b_uohm","phase_c_uohm","test_current_a"]
}'::jsonb WHERE test_code = 'ISO_CRE';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_mohm":   {"type": "number", "title": "Phase A (MΩ)"},
    "phase_b_mohm":   {"type": "number", "title": "Phase B (MΩ)"},
    "phase_c_mohm":   {"type": "number", "title": "Phase C (MΩ)"},
    "test_voltage_v": {"type": "number", "title": "Test Voltage (V)"}
  },
  "required": ["phase_a_mohm","phase_b_mohm","phase_c_mohm","test_voltage_v"]
}'::jsonb WHERE test_code = 'ISO_IR';

-- ═══════════════════════════════════════════════════════════
-- VCB (Vacuum Circuit Breaker)
-- ═══════════════════════════════════════════════════════════

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "close_time_ms":       {"type": "number", "title": "Close Time (ms)"},
    "open_time_ms":        {"type": "number", "title": "Open Time (ms)"},
    "bounce_time_ms":      {"type": "number", "title": "Bounce Time (ms)"},
    "operating_voltage_v": {"type": "number", "title": "Operating Voltage (V)"}
  },
  "required": ["close_time_ms","open_time_ms"]
}'::jsonb WHERE test_code = 'VCB_TM';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_uohm":   {"type": "number", "title": "Phase A (μΩ)"},
    "phase_b_uohm":   {"type": "number", "title": "Phase B (μΩ)"},
    "phase_c_uohm":   {"type": "number", "title": "Phase C (μΩ)"},
    "test_current_a": {"type": "number", "title": "Test Current (A)"}
  },
  "required": ["phase_a_uohm","phase_b_uohm","phase_c_uohm","test_current_a"]
}'::jsonb WHERE test_code = 'VCB_CR';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "continuity_result":   {"type": "string", "title": "Continuity", "enum": ["PASS","FAIL"]},
    "resistance_ohm":      {"type": "number", "title": "Resistance (Ω)"}
  },
  "required": ["continuity_result"]
}'::jsonb WHERE test_code = 'VCB_CON';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "test_voltage_kv":     {"type": "number", "title": "Test Voltage (kV)"},
    "leakage_current_ma":  {"type": "number", "title": "Leakage Current (mA)"},
    "duration_s":          {"type": "number", "title": "Duration (s)"},
    "hv_result":           {"type": "string", "title": "HV Test Result", "enum": ["PASS","FAIL"]}
  },
  "required": ["test_voltage_kv","leakage_current_ma","hv_result"]
}'::jsonb WHERE test_code = 'VCB_HV';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_mohm":   {"type": "number", "title": "Phase A (MΩ)"},
    "phase_b_mohm":   {"type": "number", "title": "Phase B (MΩ)"},
    "phase_c_mohm":   {"type": "number", "title": "Phase C (MΩ)"},
    "test_voltage_v": {"type": "number", "title": "Test Voltage (V)"}
  },
  "required": ["phase_a_mohm","phase_b_mohm","phase_c_mohm","test_voltage_v"]
}'::jsonb WHERE test_code = 'VCB_IRO';

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "phase_a_mohm":   {"type": "number", "title": "Phase A (MΩ)"},
    "phase_b_mohm":   {"type": "number", "title": "Phase B (MΩ)"},
    "phase_c_mohm":   {"type": "number", "title": "Phase C (MΩ)"},
    "test_voltage_v": {"type": "number", "title": "Test Voltage (V)"}
  },
  "required": ["phase_a_mohm","phase_b_mohm","phase_c_mohm","test_voltage_v"]
}'::jsonb WHERE test_code = 'VCB_IRC';

-- ═══════════════════════════════════════════════════════════
-- EARTH_PIT
-- ═══════════════════════════════════════════════════════════

UPDATE test_templates SET fields = '{
  "type": "object",
  "properties": {
    "earth_resistance_ohm":     {"type": "number", "title": "Earth Resistance (Ω)"},
    "soil_resistivity_ohm_m":   {"type": "number", "title": "Soil Resistivity (Ω·m)"},
    "test_method":              {"type": "string", "title": "Test Method", "enum": ["FALL_OF_POTENTIAL","CLAMP_ON","STAKELESS"]},
    "probe_spacing_m":          {"type": "number", "title": "Probe Spacing (m)"}
  },
  "required": ["earth_resistance_ohm","test_method"]
}'::jsonb WHERE test_code = 'EP_EPM';
