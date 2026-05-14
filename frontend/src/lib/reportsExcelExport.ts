import ExcelJS from 'exceljs';
import { NAMEPLATE_FIELDS } from './nameplateFields';
import { TEMPLATE_FALLBACKS } from './templateFallbacks';
import { isV2Schema } from './testSectionTables';

// ─── Public data types ────────────────────────────────────────────────────────

export interface ReportExportProject {
  projectNumber: string;
  siteName: string;
  siteAddress: string | null;
  client: string | null;
  status: string;
  startDate: string | null;
  createdAt: string;
  managerName: string | null;
}

export interface ReportExportProgressStats {
  total: number;
  approved: number;
  submitted: number;
  inProgress: number;
  draft: number;
}

export interface ReportExportTask {
  testName: string;
  testCode: string;
  status: string;
  instrumentId: string | null;
  passFail: string | null;
  remarks: string | null;
  reworkReason: string | null;
  assignedEngineerName: string;
  templateFields: any;
  payload: Record<string, any>;
}

export interface ReportExportEquipment {
  label: string;
  equipmentType: string;
  nameplate: Record<string, any>;
  tasks: ReportExportTask[];
}

// ─── Color helpers ────────────────────────────────────────────────────────────

// ExcelJS uses ARGB: FF prefix + 6-char hex
const argb = (hex: string) => `FF${hex.replace('#', '')}`;

const COLOR = {
  navy:       argb('0f172a'),
  warmOff:    argb('f5f0eb'),
  warmGrey:   argb('78716c'),
  slate:      argb('1c1917'),
  blue:       argb('1d4ed8'),
  darkSlate:  argb('1e293b'),
  white:      argb('ffffff'),
  border:     argb('dee2e6'),
};

const EQ_COLORS: Record<string, { primary: string; light: string }> = {
  POWER_TRANSFORMER: { primary: argb('1d4ed8'), light: argb('dbeafe') },
  CT:               { primary: argb('065f46'), light: argb('d1fae5') },
  CVT:              { primary: argb('6b21a8'), light: argb('f3e8ff') },
  LA:               { primary: argb('b45309'), light: argb('fef3c7') },
  SF6_BREAKER:      { primary: argb('9f1239'), light: argb('ffe4e6') },
  ISOLATOR:         { primary: argb('0e7490'), light: argb('cffafe') },
  VCB:              { primary: argb('4d7c0f'), light: argb('ecfccb') },
  EARTH_PIT:        { primary: argb('92400e'), light: argb('fef9c3') },
  VT:               { primary: argb('1e3a5f'), light: argb('e0f2fe') },
};
const DEFAULT_EQ = { primary: argb('374151'), light: argb('f3f4f6') };

const EQP_NAMES: Record<string, string> = {
  POWER_TRANSFORMER: 'Power Transformer',
  CT: 'Current Transformer',
  CVT: 'Capacitive Voltage Transformer',
  LA: 'Lightning Arrestor',
  SF6_BREAKER: 'SF6 Breaker',
  ISOLATOR: 'Isolator',
  VCB: 'Vacuum Circuit Breaker',
  EARTH_PIT: 'Earth Pit',
  VT: 'Voltage Transformer',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Pending Review',
  APPROVED: 'Approved',
  REWORK: 'Rework',
};

function statusColors(status: string): { bg: string; text: string } {
  switch (status) {
    case 'DRAFT':       return { bg: argb('e2e8f0'), text: argb('475569') };
    case 'IN_PROGRESS': return { bg: argb('dbeafe'), text: argb('1d4ed8') };
    case 'SUBMITTED':   return { bg: argb('fef3c7'), text: argb('b45309') };
    case 'APPROVED':    return { bg: argb('d1fae5'), text: argb('065f46') };
    case 'REWORK':      return { bg: argb('ffe4e6'), text: argb('9f1239') };
    default:            return { bg: argb('f3f4f6'), text: argb('374151') };
  }
}

// ─── Style helpers ────────────────────────────────────────────────────────────

type Fill = ExcelJS.Fill;
type Font = Partial<ExcelJS.Font>;
type Alignment = Partial<ExcelJS.Alignment>;
type Borders = Partial<ExcelJS.Borders>;

function solidFill(color: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function thinBorder(): Borders {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: COLOR.border } };
  return { top: side, left: side, bottom: side, right: side };
}

function medBorder(color: string): Borders {
  const side: Partial<ExcelJS.Border> = { style: 'medium', color: { argb: color } };
  return { top: side, left: side, bottom: side, right: side };
}

const COL_COUNT = 7;
const COL_WIDTHS = [45, 14, 16, 12, 14, 20, 30];
const COL_HEADERS = ['Test Name', 'Code', 'Instrument ID', 'Result', 'Status', 'Assigned Engineer', 'Remarks'];
const LAST_COL_LETTER = 'G';

// ─── Row styling helpers ──────────────────────────────────────────────────────

function applyToRow(
  row: ExcelJS.Row,
  fill: Fill,
  font: Font,
  alignment: Alignment,
  border?: Borders,
  height?: number,
): void {
  if (height) row.height = height;
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber > COL_COUNT) return;
    cell.fill = fill;
    cell.font = { name: 'Calibri', ...font } as ExcelJS.Font;
    cell.alignment = { wrapText: false, ...alignment } as ExcelJS.Alignment;
    if (border) cell.border = border;
  });
}

function applyToCell(cell: ExcelJS.Cell, fill: Fill, font: Font, alignment: Alignment, border?: Borders): void {
  cell.fill = fill;
  cell.font = { name: 'Calibri', ...font } as ExcelJS.Font;
  cell.alignment = { wrapText: false, ...alignment } as ExcelJS.Alignment;
  if (border) cell.border = border;
}

// ─── Equipment sub-sheet builder ─────────────────────────────────────────────

const k = (...parts: (string | number)[]) => parts.join('__');
const cv = (v: unknown): any => (v === null || v === undefined || v === '' ? '—' : v);

const EQ_SHEET_COLS = 8; // max columns used on equipment sheets

function addHeaderRowEq(ws: ExcelJS.Worksheet, values: any[], ec: { primary: string; light: string }): void {
  const row = ws.addRow(values);
  row.height = 13;
  for (let c = 1; c <= values.length; c++) {
    const cell = row.getCell(c);
    cell.fill = solidFill(ec.primary);
    cell.font = { color: { argb: COLOR.white }, bold: true, size: 8, name: 'Calibri' } as ExcelJS.Font;
    cell.alignment = { horizontal: 'center', vertical: 'middle' } as ExcelJS.Alignment;
    cell.border = thinBorder() as ExcelJS.Borders;
  }
}

function addDataRowEq(ws: ExcelJS.Worksheet, values: any[], ec: { primary: string; light: string }, alt: boolean): void {
  const row = ws.addRow(values);
  row.height = 13;
  const bg = alt ? ec.light : COLOR.white;
  for (let c = 1; c <= values.length; c++) {
    const cell = row.getCell(c);
    cell.fill = solidFill(bg);
    cell.font = { color: { argb: COLOR.slate }, size: 8, name: 'Calibri' } as ExcelJS.Font;
    cell.alignment = { vertical: 'middle' } as ExcelJS.Alignment;
    cell.border = thinBorder() as ExcelJS.Borders;
  }
}

function addMergedLabel(ws: ExcelJS.Worksheet, text: string, bg: string, font: Partial<ExcelJS.Font>, height = 14): void {
  const row = ws.addRow([text]);
  row.height = height;
  const cell = row.getCell(1);
  cell.fill = solidFill(bg);
  cell.font = { name: 'Calibri', ...font } as ExcelJS.Font;
  cell.alignment = { vertical: 'middle' } as ExcelJS.Alignment;
  ws.mergeCells(`A${row.number}:H${row.number}`);
}

function addSectionToSheet(
  ws: ExcelJS.Worksheet,
  section: any,
  payload: Record<string, any>,
  ec: { primary: string; light: string },
): void {
  // Section sub-header (if present)
  if (section.title) {
    addMergedLabel(ws, section.title, '475569', { color: { argb: COLOR.white }, bold: true, size: 8 }, 13);
  }

  switch (section.type) {
    case 'fields': {
      const fields = section.fields ?? [];
      fields.forEach((f: any, i: number) => {
        const row = ws.addRow([`${f.title}${f.unit ? ` (${f.unit})` : ''}`, cv(payload[k(section.id, f.key)])]);
        row.height = 13;
        const bg = i % 2 === 1 ? ec.light : COLOR.white;
        row.getCell(1).fill = solidFill(bg);
        row.getCell(1).font = { color: { argb: COLOR.warmGrey }, size: 8, name: 'Calibri' } as ExcelJS.Font;
        row.getCell(1).alignment = { vertical: 'middle' } as ExcelJS.Alignment;
        row.getCell(1).border = thinBorder() as ExcelJS.Borders;
        row.getCell(2).fill = solidFill(bg);
        row.getCell(2).font = { color: { argb: COLOR.slate }, bold: true, size: 8, name: 'Calibri' } as ExcelJS.Font;
        row.getCell(2).alignment = { vertical: 'middle' } as ExcelJS.Alignment;
        row.getCell(2).border = thinBorder() as ExcelJS.Borders;
      });
      break;
    }
    case 'phase_columns': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const fields = section.fields ?? [];
      addHeaderRowEq(ws, ['Parameter', ...phases.map((p: string) => `Phase ${p}`)], ec);
      fields.forEach((f: any, i: number) => {
        addDataRowEq(ws, [`${f.title}${f.unit ? ` (${f.unit})` : ''}`, ...phases.map((ph: string) => cv(payload[k(section.id, ph, f.key)]))], ec, i % 2 === 1);
      });
      break;
    }
    case 'phase_rows': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const cols = section.columns ?? [];
      addHeaderRowEq(ws, ['Phase', ...cols.map((c: any) => c.title)], ec);
      phases.forEach((ph: string, i: number) => {
        addDataRowEq(ws, [ph, ...cols.map((c: any) => cv(payload[k(section.id, ph, c.key)]))], ec, i % 2 === 1);
      });
      break;
    }
    case 'tap_table': {
      const extra = Number(payload[k(section.id, 'extra_tap_count')] ?? 0);
      const tapCount = (section.tap_count_default ?? 17) + extra;
      const cols = section.columns ?? [];
      addHeaderRowEq(ws, ['Tap No.', ...cols.map((c: any) => c.title)], ec);
      for (let n = 1; n <= tapCount; n++) {
        addDataRowEq(ws, [n, ...cols.map((c: any) => cv(payload[k(section.id, `tap${n}`, c.key)]))], ec, n % 2 === 0);
      }
      break;
    }
    case 'dynamic_table': {
      const cols = section.columns ?? [];
      const rows: Record<string, any>[] = payload[k(section.id, 'rows')] ?? [];
      addHeaderRowEq(ws, ['Sr.', ...cols.map((c: any) => c.title)], ec);
      if (rows.length === 0) {
        addMergedLabel(ws, '(No data recorded)', COLOR.warmOff, { color: { argb: COLOR.warmGrey }, italic: true, size: 8 }, 12);
      } else {
        rows.forEach((row, i) => {
          addDataRowEq(ws, [i + 1, ...cols.map((c: any) => cv(row[c.key]))], ec, i % 2 === 1);
        });
      }
      break;
    }
    case 'core_table': {
      const extra = Number(payload[k(section.id, 'extra_core_count')] ?? 0);
      const numCores = (section.num_cores_default ?? 4) + extra;
      const cols = section.columns ?? [];
      addHeaderRowEq(ws, ['Core No.', ...cols.map((c: any) => c.title)], ec);
      for (let n = 1; n <= numCores; n++) {
        addDataRowEq(ws, [n, ...cols.map((c: any) => cv(payload[k(section.id, `core${n}`, c.key)]))], ec, n % 2 === 0);
      }
      break;
    }
    case 'ir_fixed': {
      const sectionRows = section.rows ?? [];
      const cols = section.columns ?? [];
      const extraRows: any[] = payload[k(section.id, 'extra_rows')] ?? [];
      addHeaderRowEq(ws, [section.row_label_header ?? 'Measurement', ...cols.map((c: any) => c.title)], ec);
      [...sectionRows, ...extraRows].forEach((row: any, i: number) => {
        const label = row.label ?? row.insulation ?? row.parameter ?? '';
        addDataRowEq(ws, [label, ...cols.map((c: any) => cv(payload[k(section.id, row.id, c.key)]))], ec, i % 2 === 1);
      });
      break;
    }
    case 'ir_fixed_phase': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const sectionRows = section.rows ?? [];
      const extraRows: any[] = payload[k(section.id, 'extra_rows')] ?? [];
      addHeaderRowEq(ws, ['Sr.', 'Insulation Tested', 'Applied Voltage', 'Unit', ...phases.map((p: string) => `${p} Phase`)], ec);
      [...sectionRows, ...extraRows].forEach((row: any, i: number) => {
        addDataRowEq(ws, [
          row.sr ?? '', row.insulation ?? '', row.voltage ?? '', row.unit ?? '',
          ...phases.map((ph: string) => cv(payload[k(section.id, row.id, ph)])),
        ], ec, i % 2 === 1);
      });
      break;
    }
    case 'core_phase_table': {
      const cols = section.columns ?? [];
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const numCores = section.num_cores_default ?? 4;
      addHeaderRowEq(ws, ['Core', 'Phase', ...cols.map((c: any) => c.title)], ec);
      let ri = 0;
      for (let n = 1; n <= numCores; n++) {
        for (const ph of phases) {
          addDataRowEq(ws, [`Core ${n}`, ph, ...cols.map((c: any) => cv(payload[k(section.id, n, ph, c.key)]))], ec, ri % 2 === 1);
          ri++;
        }
      }
      break;
    }
    default: {
      addMergedLabel(ws, `(${section.type} — not rendered)`, COLOR.warmOff, { color: { argb: COLOR.warmGrey }, italic: true, size: 8 }, 12);
      break;
    }
  }
}

function buildEquipmentSheet(wb: ExcelJS.Workbook, eq: ReportExportEquipment, sheetName: string): void {
  const ec = EQ_COLORS[eq.equipmentType] ?? DEFAULT_EQ;
  const typeName = EQP_NAMES[eq.equipmentType] ?? eq.equipmentType.replace(/_/g, ' ');
  const npFields = NAMEPLATE_FIELDS[eq.equipmentType] ?? [];
  const approvedCount = eq.tasks.filter(t => t.status === 'APPROVED').length;

  const ws = wb.addWorksheet(sheetName);

  // Column widths: label col wider, data cols uniform
  ws.columns = [
    { width: 32 }, // A
    { width: 18 }, // B
    { width: 18 }, // C
    { width: 16 }, // D
    { width: 16 }, // E
    { width: 16 }, // F
    { width: 16 }, // G
    { width: 16 }, // H
  ];

  // ── Title row
  const titleRow = ws.addRow([`${eq.label}  —  ${typeName}    ✓ ${approvedCount} / ${eq.tasks.length} approved`]);
  titleRow.height = 20;
  titleRow.getCell(1).fill = solidFill(ec.primary);
  titleRow.getCell(1).font = { color: { argb: COLOR.white }, bold: true, size: 13, name: 'Calibri' } as ExcelJS.Font;
  titleRow.getCell(1).alignment = { vertical: 'middle' } as ExcelJS.Alignment;
  ws.mergeCells(`A${titleRow.number}:H${titleRow.number}`);

  // ── Nameplate Details
  if (npFields.length > 0) {
    ws.addRow([]); // spacer
    addMergedLabel(ws, 'NAMEPLATE DETAILS', ec.primary, { color: { argb: COLOR.white }, bold: true, size: 10 }, 16);

    // Column headers for nameplate
    const npColHdr = ws.addRow(['Field', 'Value']);
    npColHdr.height = 13;
    npColHdr.getCell(1).fill = solidFill(COLOR.darkSlate);
    npColHdr.getCell(1).font = { color: { argb: COLOR.white }, bold: true, size: 9, name: 'Calibri' } as ExcelJS.Font;
    npColHdr.getCell(1).alignment = { vertical: 'middle' } as ExcelJS.Alignment;
    npColHdr.getCell(1).border = thinBorder() as ExcelJS.Borders;
    npColHdr.getCell(2).fill = solidFill(COLOR.darkSlate);
    npColHdr.getCell(2).font = { color: { argb: COLOR.white }, bold: true, size: 9, name: 'Calibri' } as ExcelJS.Font;
    npColHdr.getCell(2).alignment = { vertical: 'middle' } as ExcelJS.Alignment;
    npColHdr.getCell(2).border = thinBorder() as ExcelJS.Borders;
    // Merge remaining cols for header
    ws.mergeCells(`B${npColHdr.number}:H${npColHdr.number}`);

    npFields.forEach((f, i) => {
      const label = f.unit ? `${f.label} (${f.unit})` : f.label;
      const val = eq.nameplate?.[f.key];
      const bg = i % 2 === 1 ? ec.light : COLOR.white;
      const npRow = ws.addRow([label, val != null && val !== '' ? val : '—']);
      npRow.height = 13;
      npRow.getCell(1).fill = solidFill(bg);
      npRow.getCell(1).font = { color: { argb: COLOR.warmGrey }, size: 9, name: 'Calibri' } as ExcelJS.Font;
      npRow.getCell(1).alignment = { vertical: 'middle' } as ExcelJS.Alignment;
      npRow.getCell(1).border = thinBorder() as ExcelJS.Borders;
      npRow.getCell(2).fill = solidFill(bg);
      npRow.getCell(2).font = { color: { argb: COLOR.slate }, bold: true, size: 9, name: 'Calibri' } as ExcelJS.Font;
      npRow.getCell(2).alignment = { vertical: 'middle' } as ExcelJS.Alignment;
      npRow.getCell(2).border = thinBorder() as ExcelJS.Borders;
      ws.mergeCells(`B${npRow.number}:H${npRow.number}`);
    });
  }

  // ── Testing Parameters
  ws.addRow([]); // spacer
  addMergedLabel(ws, 'TESTING PARAMETERS', ec.primary, { color: { argb: COLOR.white }, bold: true, size: 10 }, 16);

  for (const task of eq.tasks) {
    ws.addRow([]); // spacer before each test
    const ss = statusColors(task.status);

    // Test name strip
    const testHdrRow = ws.addRow([`${task.testName}  (${task.testCode})`, STATUS_LABELS[task.status] ?? task.status]);
    testHdrRow.height = 16;
    testHdrRow.getCell(1).fill = solidFill(ec.light);
    testHdrRow.getCell(1).font = { color: { argb: ec.primary }, bold: true, size: 9, name: 'Calibri' } as ExcelJS.Font;
    testHdrRow.getCell(1).alignment = { vertical: 'middle' } as ExcelJS.Alignment;
    ws.mergeCells(`A${testHdrRow.number}:F${testHdrRow.number}`);
    testHdrRow.getCell(7).fill = solidFill(ss.bg);
    testHdrRow.getCell(7).font = { color: { argb: ss.text }, bold: true, size: 9, name: 'Calibri' } as ExcelJS.Font;
    testHdrRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' } as ExcelJS.Alignment;
    ws.mergeCells(`G${testHdrRow.number}:H${testHdrRow.number}`);

    // Meta row: engineer | instrument | result
    const metaText = [
      task.assignedEngineerName ? `Engineer: ${task.assignedEngineerName}` : null,
      task.instrumentId ? `Instrument: ${task.instrumentId}` : null,
      task.passFail ? `Result: ${task.passFail}` : null,
      task.remarks ? `Remarks: ${task.remarks}` : null,
    ].filter(Boolean).join('   |   ');
    const metaRow = ws.addRow([metaText || '(No meta info)']);
    metaRow.height = 12;
    metaRow.getCell(1).fill = solidFill(COLOR.warmOff);
    metaRow.getCell(1).font = { color: { argb: COLOR.warmGrey }, size: 8, italic: true, name: 'Calibri' } as ExcelJS.Font;
    metaRow.getCell(1).alignment = { vertical: 'middle' } as ExcelJS.Alignment;
    ws.mergeCells(`A${metaRow.number}:H${metaRow.number}`);

    // Resolve schema
    const schema = isV2Schema(task.templateFields)
      ? task.templateFields
      : (TEMPLATE_FALLBACKS[task.testCode] ?? null);

    if (schema && schema.sections.length > 0) {
      for (const sec of schema.sections) {
        addSectionToSheet(ws, sec, task.payload ?? {}, ec);
      }
    } else if (task.payload && Object.keys(task.payload).length > 0) {
      // Fallback: dump key-value pairs
      Object.entries(task.payload).forEach(([key, val], i) => {
        if (key.startsWith('_')) return;
        addDataRowEq(ws, [key, val], ec, i % 2 === 1);
      });
    } else {
      addMergedLabel(ws, '(No parameter data recorded)', COLOR.warmOff, { color: { argb: COLOR.warmGrey }, italic: true, size: 8 }, 12);
    }
  }

  // Freeze top 2 rows (title + first nameplate header)
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' }];
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportReportExcel(
  project: ReportExportProject,
  stats: ReportExportProgressStats,
  equipment: ReportExportEquipment[],
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Test Report');

  ws.columns = COL_WIDTHS.map(w => ({ width: w }));

  const approvedPct = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  // ── Row 1: Title ────────────────────────────────────────────────────────────
  {
    const row = ws.addRow([
      `PROJECT TEST REPORT — ${project.projectNumber}`,
      null, null, null, null, null, null,
    ]);
    ws.mergeCells(`A${row.number}:${LAST_COL_LETTER}${row.number}`);
    applyToRow(
      row,
      solidFill(COLOR.navy),
      { color: { argb: COLOR.white }, bold: true, size: 14 },
      { horizontal: 'center', vertical: 'middle' },
      undefined,
      22,
    );
  }

  // ── Row 2: Project info line 1 ──────────────────────────────────────────────
  {
    const row = ws.addRow([
      'PROJECT NO:', project.projectNumber,
      'SITE:', project.siteName,
      'CLIENT:', project.client ?? '—', null,
    ]);
    ws.mergeCells(`F${row.number}:${LAST_COL_LETTER}${row.number}`);
    row.height = 15;
    const labelFont: Font = { color: { argb: COLOR.warmGrey }, size: 9 };
    const valueFont: Font = { color: { argb: COLOR.slate }, bold: true, size: 9 };
    const labelAlign: Alignment = { vertical: 'middle' };
    const valueAlign: Alignment = { vertical: 'middle' };
    [1, 3, 5].forEach(c => applyToCell(row.getCell(c), solidFill(COLOR.warmOff), labelFont, labelAlign, thinBorder()));
    [2, 4, 6].forEach(c => applyToCell(row.getCell(c), solidFill(COLOR.warmOff), valueFont, valueAlign, thinBorder()));
    applyToCell(row.getCell(7), solidFill(COLOR.warmOff), valueFont, valueAlign, thinBorder());
  }

  // ── Row 3: Project info line 2 ──────────────────────────────────────────────
  {
    const row = ws.addRow([
      'MANAGER:', project.managerName ?? '—',
      'STATUS:', STATUS_LABELS[project.status] ?? project.status,
      'DATE:', project.startDate ?? '—', null,
    ]);
    ws.mergeCells(`F${row.number}:${LAST_COL_LETTER}${row.number}`);
    row.height = 15;
    const labelFont: Font = { color: { argb: COLOR.warmGrey }, size: 9 };
    const valueFont: Font = { color: { argb: COLOR.slate }, bold: true, size: 9 };
    const align: Alignment = { vertical: 'middle' };
    [1, 3, 5].forEach(c => applyToCell(row.getCell(c), solidFill(COLOR.warmOff), labelFont, align, thinBorder()));
    [2, 4, 6].forEach(c => applyToCell(row.getCell(c), solidFill(COLOR.warmOff), valueFont, align, thinBorder()));
    applyToCell(row.getCell(7), solidFill(COLOR.warmOff), valueFont, align, thinBorder());
  }

  // ── Row 4: Empty separator ──────────────────────────────────────────────────
  {
    const row = ws.addRow([null, null, null, null, null, null, null]);
    row.height = 6;
    applyToRow(row, solidFill(COLOR.warmOff), {}, {});
  }

  // ── Row 5: Progress summary ─────────────────────────────────────────────────
  {
    const text = `Tests Approved: ${stats.approved} / ${stats.total} (${approvedPct}%)  |  Pending Review: ${stats.submitted}  |  In Progress: ${stats.inProgress}  |  Not Started: ${stats.draft}`;
    const row = ws.addRow([text, null, null, null, null, null, null]);
    ws.mergeCells(`A${row.number}:${LAST_COL_LETTER}${row.number}`);
    applyToRow(
      row,
      solidFill(COLOR.blue),
      { color: { argb: COLOR.white }, bold: true, size: 9 },
      { horizontal: 'center', vertical: 'middle' },
      undefined,
      16,
    );
  }

  // ── Row 6: Column headers (first occurrence — auto-filter here) ─────────────
  const HEADER_ROW_NUM = ws.rowCount + 1;
  {
    const row = ws.addRow(COL_HEADERS);
    applyToRow(
      row,
      solidFill(COLOR.darkSlate),
      { color: { argb: COLOR.white }, bold: true, size: 9 },
      { horizontal: 'center', vertical: 'middle' },
      thinBorder(),
      16,
    );
  }

  // ── Data rows: equipment groups ─────────────────────────────────────────────
  for (const eq of equipment) {
    const ec = EQ_COLORS[eq.equipmentType] ?? DEFAULT_EQ;
    const approvedCount = eq.tasks.filter(t => t.status === 'APPROVED').length;
    const eqDisplayName = EQP_NAMES[eq.equipmentType] ?? eq.equipmentType.replace(/_/g, ' ');

    // Equipment header row
    {
      const headerText = `${eq.label}  —  ${eqDisplayName}    ✓ ${approvedCount} / ${eq.tasks.length} approved`;
      const row = ws.addRow([headerText, null, null, null, null, null, null]);
      ws.mergeCells(`A${row.number}:${LAST_COL_LETTER}${row.number}`);
      applyToRow(
        row,
        solidFill(ec.primary),
        { color: { argb: COLOR.white }, bold: true, size: 11 },
        { vertical: 'middle' },
        medBorder(ec.primary),
        18,
      );
    }

    // Repeated column headers after each equipment block
    {
      const row = ws.addRow(COL_HEADERS);
      applyToRow(
        row,
        solidFill(COLOR.darkSlate),
        { color: { argb: COLOR.white }, bold: true, size: 9 },
        { horizontal: 'center', vertical: 'middle' },
        thinBorder(),
        14,
      );
    }

    // Test data rows
    eq.tasks.forEach((task, idx) => {
      const ss = statusColors(task.status);
      const rowBg = idx % 2 === 1 ? ec.light : COLOR.white;

      const row = ws.addRow([
        task.testName,
        task.testCode,
        task.instrumentId ?? '—',
        task.passFail ?? '—',
        STATUS_LABELS[task.status] ?? task.status,
        task.assignedEngineerName,
        task.remarks ?? '—',
      ]);
      row.height = 14;

      // Default style for all cells
      const defaultFill = solidFill(rowBg);
      const defaultFont: Font = { color: { argb: COLOR.slate }, size: 8 };
      const defaultAlign: Alignment = { vertical: 'middle' };
      applyToRow(row, defaultFill, defaultFont, defaultAlign, thinBorder());

      // Status cell (column 5) — override with status color
      applyToCell(
        row.getCell(5),
        solidFill(ss.bg),
        { color: { argb: ss.text }, size: 8, bold: true },
        { horizontal: 'center', vertical: 'middle' },
        thinBorder(),
      );
    });
  }

  // ── Sheet settings ──────────────────────────────────────────────────────────

  // Freeze top 6 rows
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 6, topLeftCell: 'A7', activePane: 'bottomLeft' }];

  // Auto-filter on the first column header row (row 6)
  ws.autoFilter = {
    from: { row: HEADER_ROW_NUM, column: 1 },
    to: { row: HEADER_ROW_NUM, column: COL_COUNT },
  };

  // ── Equipment sub-sheets (one per instance) ────────────────────────────────
  const usedSheetNames = new Set<string>(['Test Report']);
  for (const eq of equipment) {
    let sheetName = eq.label.slice(0, 31);
    if (usedSheetNames.has(sheetName)) {
      sheetName = `${sheetName.slice(0, 28)}_${usedSheetNames.size}`;
    }
    usedSheetNames.add(sheetName);
    buildEquipmentSheet(wb, eq, sheetName);
  }

  // ── Download ────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${project.projectNumber}_${project.siteName.replace(/[^a-zA-Z0-9]/g, '_')}_Report.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
