/**
 * projectExcelExport.ts
 *
 * Generates an Excel workbook (one sheet per equipment type) from all test
 * records in a project.  The layout mirrors the eqp_tables.xlsx template:
 *   - Title row
 *   - Section headers (bold, merged)
 *   - Data tables with predefined rows / columns
 *
 * Depends on SheetJS (xlsx).
 */

import * as XLSX from 'xlsx';

// ─── Types mirrored from TestFormV2 ─────────────────────────────────────────

interface ColDef { key: string; title: string; }
interface FieldDef { key: string; title: string; unit?: string; }
interface RowDef { id: string; sr?: string; label?: string; insulation?: string; voltage?: string; unit?: string; }

interface Section {
  id: string;
  title: string;
  note?: string;
  type: string;
  fields?: FieldDef[];
  phases?: string[];
  columns?: ColDef[];
  rows?: RowDef[];
  row_label_header?: string;
  tap_count_default?: number;
  default_rows?: number;
  num_cores_default?: number;
}

interface TemplateSchema {
  version: number;
  sections: Section[];
}

// ─── Equipment display names ─────────────────────────────────────────────────

const EQP_NAMES: Record<string, string> = {
  POWER_TRANSFORMER: 'Power Transformer',
  CT: 'Current Transformer (OCT)',
  CVT: 'Capacitive Voltage Transformer',
  LA: 'Lightning Arrestor',
  SF6_BREAKER: 'SF6 Breaker',
  ISOLATOR: 'Isolator',
  VCB: 'Vacuum Circuit Breaker',
  EARTH_PIT: 'Earth Pit',
  VT: 'Voltage Transformer',
};

// ─── Key builder (matches TestFormV2 storage convention) ────────────────────

const k = (...parts: (string | number)[]) => parts.join('__');

// ─── Cell helpers ────────────────────────────────────────────────────────────

type CellValue = string | number | null | undefined;
type AoA = CellValue[][];

function hdr(text: string): CellValue { return text; }

// Build XLSX worksheet from array-of-arrays and apply basic styles
function buildSheet(data: AoA): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(data);
  return ws;
}

// ─── Section renderers → rows ────────────────────────────────────────────────

function renderSection(section: Section, payload: Record<string, any>): AoA {
  const rows: AoA = [];

  // Section title
  if (section.title) {
    rows.push([section.title]);
    rows.push([]); // blank spacer
  }

  switch (section.type) {
    case 'fields': {
      const fields = section.fields ?? [];
      for (const f of fields) {
        const val = payload[k(section.id, f.key)] ?? '';
        rows.push([`${f.title}${f.unit ? ` (${f.unit})` : ''}`, val]);
      }
      break;
    }

    case 'phase_columns': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const fields = section.fields ?? [];
      // Header row
      rows.push(['Parameter', ...phases.map(p => `Phase ${p}`)]);
      for (const f of fields) {
        rows.push([
          f.title,
          ...phases.map(ph => payload[k(section.id, ph, f.key)] ?? ''),
        ]);
      }
      break;
    }

    case 'phase_rows': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const cols = section.columns ?? [];
      rows.push(['Phase', ...cols.map(c => c.title)]);
      for (const ph of phases) {
        rows.push([ph, ...cols.map(c => payload[k(section.id, ph, c.key)] ?? '')]);
      }
      break;
    }

    case 'tap_table': {
      const extraCount: number = payload[k(section.id, 'extra_tap_count')] ?? 0;
      const tapCount = (section.tap_count_default ?? 17) + extraCount;
      const cols = section.columns ?? [];
      rows.push(['Tap No.', ...cols.map(c => c.title)]);
      for (let n = 1; n <= tapCount; n++) {
        rows.push([n, ...cols.map(c => payload[k(section.id, `tap${n}`, c.key)] ?? '')]);
      }
      break;
    }

    case 'dynamic_table': {
      const cols = section.columns ?? [];
      const storedRows: Record<string, any>[] = payload[k(section.id, 'rows')] ?? [];
      rows.push(['Sr.', ...cols.map(c => c.title)]);
      storedRows.forEach((row, i) => {
        rows.push([i + 1, ...cols.map(c => row[c.key] ?? '')]);
      });
      break;
    }

    case 'core_table': {
      const extraCount: number = payload[k(section.id, 'extra_core_count')] ?? 0;
      const numCores = (section.num_cores_default ?? 4) + extraCount;
      const cols = section.columns ?? [];
      rows.push(['Core No.', ...cols.map(c => c.title)]);
      for (let n = 1; n <= numCores; n++) {
        rows.push([n, ...cols.map(c => payload[k(section.id, `core${n}`, c.key)] ?? '')]);
      }
      break;
    }

    case 'ir_fixed': {
      const sectionRows = section.rows ?? [];
      const cols = section.columns ?? [];
      const extraRows: Array<{ id: string; label: string }> = payload[k(section.id, 'extra_rows')] ?? [];
      rows.push([section.row_label_header ?? 'Measurement', ...cols.map(c => c.title)]);
      for (const row of sectionRows) {
        rows.push([row.label ?? row.insulation ?? '', ...cols.map(c => payload[k(section.id, row.id, c.key)] ?? '')]);
      }
      for (const row of extraRows) {
        rows.push([row.label ?? '', ...cols.map(c => payload[k(section.id, row.id, c.key)] ?? '')]);
      }
      break;
    }

    case 'ir_fixed_phase': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const sectionRows = section.rows ?? [];
      const extraRows: Array<{ id: string; insulation: string; voltage: string; unit: string }> =
        payload[k(section.id, 'extra_rows')] ?? [];
      rows.push(['Sr.', 'Insulation Tested', 'Applied Voltage', 'Unit', ...phases.map(p => `${p} Phase`)]);
      for (const row of sectionRows) {
        rows.push([
          row.sr ?? '',
          row.insulation ?? '',
          row.voltage ?? '',
          row.unit ?? '',
          ...phases.map(ph => payload[k(section.id, row.id, ph)] ?? ''),
        ]);
      }
      for (const row of extraRows) {
        rows.push([
          '',
          row.insulation ?? '',
          row.voltage ?? '',
          row.unit ?? '',
          ...phases.map(ph => payload[k(section.id, row.id, ph)] ?? ''),
        ]);
      }
      break;
    }

    case 'core_phase_table': {
      const cols = section.columns ?? [];
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const numCores = section.num_cores_default ?? 4;
      rows.push(['Core', 'Phase', ...cols.map(c => c.title)]);
      for (let n = 1; n <= numCores; n++) {
        for (const ph of phases) {
          rows.push([`Core ${n}`, ph, ...cols.map(c => payload[k(section.id, n, ph, c.key)] ?? '')]);
        }
      }
      break;
    }

    default:
      rows.push([`(${section.type} section — data not displayed in export)`]);
  }

  rows.push([]); // blank spacer between sections
  return rows;
}

// ─── Build one sheet per equipment instance ──────────────────────────────────

interface TaskData {
  instanceLabel: string;
  equipmentType: string;
  testName: string;
  templateFields: any;       // raw JSON from test_templates.fields
  payload: Record<string, any>;  // from test_records.payload
}

function buildEquipmentSheet(instanceLabel: string, tasks: TaskData[]): XLSX.WorkSheet {
  const aoa: AoA = [];

  // Title
  const eqpType = tasks[0]?.equipmentType ?? '';
  aoa.push([`${EQP_NAMES[eqpType] ?? eqpType} — ${instanceLabel}`]);
  aoa.push([]);

  for (const task of tasks) {
    aoa.push([`=== ${task.testName} ===`]);
    aoa.push([]);

    const schema: TemplateSchema | null = task.templateFields;
    if (!schema || schema.version !== 2 || !Array.isArray(schema.sections)) {
      // v1 / raw — just dump key-value pairs
      for (const [key, val] of Object.entries(task.payload)) {
        if (!key.startsWith('_')) aoa.push([key, val]);
      }
      aoa.push([]);
      continue;
    }

    for (const section of schema.sections) {
      const sectionRows = renderSection(section, task.payload);
      aoa.push(...sectionRows);
    }
  }

  return buildSheet(aoa);
}

// ─── Main export function ────────────────────────────────────────────────────

export interface ExportTask {
  id: string;
  instanceLabel: string;
  equipmentType: string;
  testName: string;
  templateFields: any;
  payload: Record<string, any>;
}

export function exportProjectExcel(
  projectNumber: string,
  siteName: string,
  tasks: ExportTask[],
): void {
  const wb = XLSX.utils.book_new();

  // Group tasks by instance label
  const byInstance = new Map<string, ExportTask[]>();
  for (const t of tasks) {
    const key = `${t.equipmentType}__${t.instanceLabel}`;
    if (!byInstance.has(key)) byInstance.set(key, []);
    byInstance.get(key)!.push(t);
  }

  // One sheet per instance (max 31 chars for sheet name)
  const usedNames = new Set<string>();
  for (const [, instanceTasks] of byInstance) {
    const raw = instanceTasks[0].instanceLabel;
    let sheetName = raw.slice(0, 31);
    // Deduplicate if needed
    if (usedNames.has(sheetName)) {
      sheetName = `${sheetName.slice(0, 28)}_${usedNames.size}`;
    }
    usedNames.add(sheetName);

    const ws = buildEquipmentSheet(raw, instanceTasks);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  if (wb.SheetNames.length === 0) {
    // Fallback empty sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No test data found']]), 'Info');
  }

  const filename = `${projectNumber}_${siteName.replace(/[^a-zA-Z0-9]/g, '_')}_TestData.xlsx`;
  XLSX.writeFile(wb, filename);
}
