import * as XLSX from 'xlsx';
import { renderSection, type AoA, type CellValue } from './projectExcelExport';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function row(...cells: CellValue[]): CellValue[] { return cells; }
function blank(): CellValue[] { return []; }
function section(title: string): CellValue[] { return [`— ${title} —`]; }

function setColWidths(ws: XLSX.WorkSheet, widths: number[]): void {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

// ─── Overview sheet ───────────────────────────────────────────────────────────

function buildOverviewSheet(
  project: ReportExportProject,
  stats: ReportExportProgressStats,
  equipment: ReportExportEquipment[],
): XLSX.WorkSheet {
  const approvedPct = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  const aoa: AoA = [
    // Title block
    row('PROJECT TEST REPORT'),
    blank(),
    // Project details
    section('PROJECT DETAILS'),
    row('Project Number', project.projectNumber),
    row('Site Name', project.siteName),
    row('Client', project.client ?? '—'),
    row('Site Address', project.siteAddress ?? '—'),
    row('Manager', project.managerName ?? '—'),
    row('Status', project.status),
    row('Start Date', project.startDate ?? '—'),
    row('Created', project.createdAt),
    blank(),
    // Progress summary
    section('PROGRESS SUMMARY'),
    row('Tests Approved', `${stats.approved} / ${stats.total} (${approvedPct}%)`),
    row('Pending Review', stats.submitted),
    row('In Progress', stats.inProgress),
    row('Not Started (Draft)', stats.draft),
    blank(),
    // Equipment summary table
    section('EQUIPMENT SUMMARY'),
    row('Equipment', 'Type', 'Total Tests', 'Approved', 'Pending Review', 'In Progress', 'Draft / Rework'),
  ];

  for (const eq of equipment) {
    const approved = eq.tasks.filter(t => t.status === 'APPROVED').length;
    const submitted = eq.tasks.filter(t => t.status === 'SUBMITTED').length;
    const inProgress = eq.tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const draft = eq.tasks.filter(t => t.status === 'DRAFT' || t.status === 'REWORK').length;
    aoa.push(row(
      eq.label,
      EQP_NAMES[eq.equipmentType] ?? eq.equipmentType.replace(/_/g, ' '),
      eq.tasks.length,
      approved,
      submitted,
      inProgress,
      draft,
    ));
  }

  aoa.push(blank());

  // Full test list
  aoa.push(section('ALL TESTS'));
  aoa.push(row('Equipment', 'Type', 'Test Name', 'Code', 'Status', 'Pass/Fail', 'Instrument ID', 'Engineer', 'Remarks'));

  for (const eq of equipment) {
    for (const task of eq.tasks) {
      aoa.push(row(
        eq.label,
        EQP_NAMES[eq.equipmentType] ?? eq.equipmentType.replace(/_/g, ' '),
        task.testName,
        task.testCode,
        STATUS_LABELS[task.status] ?? task.status,
        task.passFail ?? '—',
        task.instrumentId ?? '—',
        task.assignedEngineerName,
        task.remarks ?? '—',
      ));
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColWidths(ws, [22, 28, 10, 24, 18, 22, 14, 18, 22, 32]);
  return ws;
}

// ─── Equipment sheet ──────────────────────────────────────────────────────────

function buildEquipmentSheet(eq: ReportExportEquipment): XLSX.WorkSheet {
  const typeName = EQP_NAMES[eq.equipmentType] ?? eq.equipmentType.replace(/_/g, ' ');
  const aoa: AoA = [];

  // Header
  aoa.push(row(`${typeName} — ${eq.label}`));
  aoa.push(blank());

  // ── Nameplate Details ──────────────────────────────────────────────────────
  const npFields = NAMEPLATE_FIELDS[eq.equipmentType] ?? [];
  if (npFields.length > 0) {
    aoa.push(section('NAMEPLATE DETAILS'));
    aoa.push(row('Field', 'Value'));
    for (const f of npFields) {
      const label = f.unit ? `${f.label} (${f.unit})` : f.label;
      const val = eq.nameplate?.[f.key];
      aoa.push(row(label, val != null && val !== '' ? val : '—'));
    }
    aoa.push(blank());
  }

  // ── Test Results Summary ───────────────────────────────────────────────────
  aoa.push(section('TEST RESULTS SUMMARY'));
  aoa.push(row('Test Name', 'Code', 'Status', 'Pass/Fail', 'Instrument ID', 'Engineer', 'Remarks', 'Rework Reason'));
  for (const task of eq.tasks) {
    aoa.push(row(
      task.testName,
      task.testCode,
      STATUS_LABELS[task.status] ?? task.status,
      task.passFail ?? '—',
      task.instrumentId ?? '—',
      task.assignedEngineerName,
      task.remarks ?? '—',
      task.reworkReason ?? '—',
    ));
  }
  aoa.push(blank());

  // ── Testing Parameters ─────────────────────────────────────────────────────
  aoa.push(section('TESTING PARAMETERS'));

  for (const task of eq.tasks) {
    aoa.push(row(`>>> ${task.testName} (${task.testCode})`));
    aoa.push(row('Status', STATUS_LABELS[task.status] ?? task.status));
    if (task.instrumentId) aoa.push(row('Instrument ID', task.instrumentId));
    if (task.passFail) aoa.push(row('Pass / Fail', task.passFail));
    if (task.assignedEngineerName) aoa.push(row('Engineer', task.assignedEngineerName));
    aoa.push(blank());

    // Resolve schema
    const schema = isV2Schema(task.templateFields)
      ? task.templateFields
      : (TEMPLATE_FALLBACKS[task.testCode] ?? null);

    if (schema && schema.sections.length > 0) {
      for (const s of schema.sections) {
        const sectionRows = renderSection(s, task.payload ?? {});
        aoa.push(...sectionRows);
      }
    } else if (task.payload && Object.keys(task.payload).length > 0) {
      // Fallback: dump key-value
      for (const [key, val] of Object.entries(task.payload)) {
        if (!key.startsWith('_')) aoa.push(row(key, val));
      }
      aoa.push(blank());
    } else {
      aoa.push(row('(No parameter data recorded)'));
      aoa.push(blank());
    }

    aoa.push(blank());
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColWidths(ws, [30, 22, 14, 14, 16, 20, 28, 28]);
  return ws;
}

// ─── Main export function ─────────────────────────────────────────────────────

export function exportReportExcel(
  project: ReportExportProject,
  stats: ReportExportProgressStats,
  equipment: ReportExportEquipment[],
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Overview
  const overviewWs = buildOverviewSheet(project, stats, equipment);
  XLSX.utils.book_append_sheet(wb, overviewWs, 'Overview');

  // One sheet per equipment instance
  const usedNames = new Set<string>(['Overview']);
  for (const eq of equipment) {
    let sheetName = eq.label.slice(0, 31);
    if (usedNames.has(sheetName)) {
      sheetName = `${sheetName.slice(0, 28)}_${usedNames.size}`;
    }
    usedNames.add(sheetName);
    XLSX.utils.book_append_sheet(wb, buildEquipmentSheet(eq), sheetName);
  }

  if (wb.SheetNames.length === 1) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No equipment data found']]), 'Info');
  }

  const fname = `${project.projectNumber}_${project.siteName.replace(/[^a-zA-Z0-9]/g, '_')}_Report.xlsx`;
  XLSX.writeFile(wb, fname);
}
