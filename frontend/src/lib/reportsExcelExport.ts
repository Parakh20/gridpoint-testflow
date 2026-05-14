import ExcelJS from 'exceljs';

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
