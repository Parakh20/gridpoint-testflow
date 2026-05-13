import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { NAMEPLATE_FIELDS } from '@/lib/nameplateFields';
import type { Section, TemplateSchema } from '@/lib/testSectionTables';

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff', fontWeight: 700 },
  ],
});

const NAVY = '#1a2332';
const BLUE = '#3b82f6';
const BORDER = '#e2e8f0';
const ROW_ALT = '#f7f8fa';
const MUTED = '#64748b';

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, color: '#0f172a', paddingBottom: 36 },
  // Page header bar
  pageHeader: { backgroundColor: NAVY, padding: '10 24 10 24', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageHeaderLeft: { flexDirection: 'column' },
  pageHeaderTitle: { color: '#ffffff', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 },
  pageHeaderSub: { color: '#94a3b8', fontSize: 7, marginTop: 1 },
  pageHeaderRight: { color: '#94a3b8', fontSize: 7, textAlign: 'right' },
  // Fixed footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: BORDER, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '5 24', backgroundColor: '#ffffff' },
  footerText: { fontSize: 7, color: MUTED },
  // Content area
  content: { padding: '16 24' },
  // Cover page
  coverBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  coverBrandBox: { width: 28, height: 28, backgroundColor: BLUE, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  coverBrandBoxText: { color: '#fff', fontSize: 14, fontWeight: 700 },
  coverBrandName: { fontSize: 16, fontWeight: 700, color: NAVY },
  coverBrandSub: { fontSize: 7, color: MUTED, letterSpacing: 1 },
  coverHero: { backgroundColor: NAVY, borderRadius: 4, padding: '20 20 16 20', marginBottom: 16 },
  coverHeroNumber: { color: '#ffffff', fontSize: 22, fontWeight: 700, marginBottom: 4 },
  coverHeroSite: { color: '#94a3b8', fontSize: 11 },
  coverHeroStatus: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#3b82f620', borderRadius: 3, padding: '2 6' },
  coverHeroStatusText: { color: '#93c5fd', fontSize: 8, fontWeight: 600 },
  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 12 },
  infoCell: { width: '50%', paddingVertical: 6, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  infoCellLabel: { fontSize: 7, color: MUTED, marginBottom: 2 },
  infoCellValue: { fontSize: 9, fontWeight: 600 },
  // Progress
  progressSection: { marginBottom: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 8, color: MUTED },
  progressValue: { fontSize: 8, fontWeight: 600 },
  progressBarOuter: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginBottom: 8 },
  progressBarInner: { height: 6, backgroundColor: BLUE, borderRadius: 3 },
  progressPills: { flexDirection: 'row', gap: 12 },
  progressPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  progressDot: { width: 6, height: 6, borderRadius: 3 },
  progressPillText: { fontSize: 7, color: MUTED },
  // Equipment section header
  equipHeader: { backgroundColor: NAVY, borderRadius: 4, padding: '8 12', marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  equipHeaderLabel: { color: '#ffffff', fontSize: 11, fontWeight: 700 },
  equipHeaderType: { color: '#94a3b8', fontSize: 8 },
  // Sub-section label
  subSectionTitle: { fontSize: 9, fontWeight: 700, color: NAVY, backgroundColor: '#f1f5f9', padding: '4 8', borderLeftWidth: 3, borderLeftColor: BLUE, marginBottom: 6 },
  // Test block header
  testHeader: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: BORDER, padding: '5 8', marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0 },
  testHeaderName: { fontSize: 9, fontWeight: 600 },
  testHeaderCode: { fontSize: 7, color: MUTED },
  testMeta: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: BORDER, padding: '3 8', marginBottom: 6, backgroundColor: '#ffffff', borderTopWidth: 0 },
  testMetaItem: { flexDirection: 'row', gap: 3 },
  testMetaLabel: { fontSize: 7, color: MUTED },
  testMetaValue: { fontSize: 7, fontWeight: 600 },
  // Status badge
  badgeApproved: { backgroundColor: '#dcfce7', borderRadius: 2, padding: '1 4' },
  badgeSubmitted: { backgroundColor: '#fef3c7', borderRadius: 2, padding: '1 4' },
  badgeDraft: { backgroundColor: '#f1f5f9', borderRadius: 2, padding: '1 4' },
  badgeRework: { backgroundColor: '#fee2e2', borderRadius: 2, padding: '1 4' },
  badgeInProgress: { backgroundColor: '#dbeafe', borderRadius: 2, padding: '1 4' },
  badgeText: { fontSize: 7, fontWeight: 600 },
  // Table primitives
  table: { marginBottom: 10 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: NAVY },
  tableHeaderCell: { padding: '4 6', flex: 1 },
  tableHeaderCellText: { color: '#ffffff', fontSize: 7, fontWeight: 700 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  tableRowAlt: { flexDirection: 'row', backgroundColor: ROW_ALT, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableCell: { padding: '4 6', flex: 1 },
  tableCellText: { fontSize: 8 },
  tableCellTextMuted: { fontSize: 8, color: MUTED },
  // KV table (nameplate)
  kvRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  kvRowAlt: { flexDirection: 'row', backgroundColor: ROW_ALT, borderBottomWidth: 1, borderBottomColor: BORDER },
  kvLabel: { padding: '4 6', width: '40%', fontSize: 8, color: MUTED },
  kvValue: { padding: '4 6', flex: 1, fontSize: 8 },
  // Separator
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  sectionTitle: { fontSize: 8, fontWeight: 600, color: MUTED, marginBottom: 4 },
  noData: { fontSize: 8, color: MUTED, fontStyle: 'italic', marginBottom: 8 },
});

const k = (...parts: (string | number)[]) => parts.join('__');
const cell = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, [object, string]> = {
    APPROVED: [s.badgeApproved, 'Approved'],
    SUBMITTED: [s.badgeSubmitted, 'Submitted'],
    IN_PROGRESS: [s.badgeInProgress, 'In Progress'],
    DRAFT: [s.badgeDraft, 'Draft'],
    REWORK: [s.badgeRework, 'Rework'],
  };
  const [style, label] = map[status] ?? [s.badgeDraft, status];
  return <View style={style as any}><Text style={s.badgeText}>{label}</Text></View>;
}

// ─── Section table (mirrors testSectionTables.tsx for react-pdf) ──────────────

function PDFSectionTable({ section, payload }: { section: Section; payload: Record<string, any> }) {
  const TitleRow = section.title ? (
    <Text style={s.sectionTitle}>{section.title}</Text>
  ) : null;

  switch (section.type) {
    case 'fields': {
      const fields = section.fields ?? [];
      if (!fields.length) return null;
      return (
        <View style={s.table}>
          {TitleRow}
          {fields.map((f, idx) => (
            <View key={f.key} style={idx % 2 === 0 ? s.kvRow : s.kvRowAlt}>
              <Text style={s.kvLabel}>{f.title}{f.unit ? ` (${f.unit})` : ''}</Text>
              <Text style={s.kvValue}>{cell(payload[k(section.id, f.key)])}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'phase_columns': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const fields = section.fields ?? [];
      return (
        <View style={s.table}>
          {TitleRow}
          <View style={s.tableHeaderRow}>
            <View style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>Parameter</Text></View>
            {phases.map(p => (
              <View key={p} style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>Phase {p}</Text></View>
            ))}
          </View>
          {fields.map((f, idx) => (
            <View key={f.key} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.tableCell}><Text style={s.tableCellText}>{f.title}{f.unit ? ` (${f.unit})` : ''}</Text></View>
              {phases.map(ph => (
                <View key={ph} style={s.tableCell}>
                  <Text style={s.tableCellText}>{cell(payload[k(section.id, ph, f.key)])}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    case 'phase_rows': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const cols = section.columns ?? [];
      return (
        <View style={s.table}>
          {TitleRow}
          <View style={s.tableHeaderRow}>
            <View style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>Phase</Text></View>
            {cols.map(c => (
              <View key={c.key} style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>{c.title}</Text></View>
            ))}
          </View>
          {phases.map((ph, idx) => (
            <View key={ph} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.tableCell}><Text style={s.tableCellText}>{ph}</Text></View>
              {cols.map(c => (
                <View key={c.key} style={s.tableCell}>
                  <Text style={s.tableCellText}>{cell(payload[k(section.id, ph, c.key)])}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    case 'tap_table': {
      const extra = Number(payload[k(section.id, 'extra_tap_count')] ?? 0);
      const tapCount = (section.tap_count_default ?? 17) + extra;
      const cols = section.columns ?? [];
      return (
        <View style={s.table}>
          {TitleRow}
          <View style={s.tableHeaderRow}>
            <View style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>Tap No.</Text></View>
            {cols.map(c => (
              <View key={c.key} style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>{c.title}</Text></View>
            ))}
          </View>
          {Array.from({ length: tapCount }, (_, i) => i + 1).map((n, idx) => (
            <View key={n} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.tableCell}><Text style={s.tableCellText}>{n}</Text></View>
              {cols.map(c => (
                <View key={c.key} style={s.tableCell}>
                  <Text style={s.tableCellText}>{cell(payload[k(section.id, `tap${n}`, c.key)])}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    case 'dynamic_table': {
      const cols = section.columns ?? [];
      const rows: Record<string, any>[] = payload[k(section.id, 'rows')] ?? [];
      return (
        <View style={s.table}>
          {TitleRow}
          <View style={s.tableHeaderRow}>
            <View style={[s.tableHeaderCell, { maxWidth: 24 }]}><Text style={s.tableHeaderCellText}>Sr.</Text></View>
            {cols.map(c => (
              <View key={c.key} style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>{c.title}</Text></View>
            ))}
          </View>
          {rows.length === 0
            ? <View style={s.tableRow}><View style={s.tableCell}><Text style={s.tableCellTextMuted}>No rows</Text></View></View>
            : rows.map((row, idx) => (
              <View key={idx} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <View style={[s.tableCell, { maxWidth: 24 }]}><Text style={s.tableCellText}>{idx + 1}</Text></View>
                {cols.map(c => (
                  <View key={c.key} style={s.tableCell}><Text style={s.tableCellText}>{cell(row[c.key])}</Text></View>
                ))}
              </View>
            ))
          }
        </View>
      );
    }

    case 'core_table': {
      const extra = Number(payload[k(section.id, 'extra_core_count')] ?? 0);
      const numCores = (section.num_cores_default ?? 4) + extra;
      const cols = section.columns ?? [];
      return (
        <View style={s.table}>
          {TitleRow}
          <View style={s.tableHeaderRow}>
            <View style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>Core No.</Text></View>
            {cols.map(c => (
              <View key={c.key} style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>{c.title}</Text></View>
            ))}
          </View>
          {Array.from({ length: numCores }, (_, i) => i + 1).map((n, idx) => (
            <View key={n} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.tableCell}><Text style={s.tableCellText}>{n}</Text></View>
              {cols.map(c => (
                <View key={c.key} style={s.tableCell}>
                  <Text style={s.tableCellText}>{cell(payload[k(section.id, `core${n}`, c.key)])}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    case 'ir_fixed': {
      const sectionRows = section.rows ?? [];
      const cols = section.columns ?? [];
      const extraRows: Array<{ id: string; label: string }> = payload[k(section.id, 'extra_rows')] ?? [];
      const allRows = [...sectionRows.map(r => ({ id: r.id, label: r.label ?? r.insulation ?? r.parameter ?? '' })), ...extraRows];
      return (
        <View style={s.table}>
          {TitleRow}
          <View style={s.tableHeaderRow}>
            <View style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>{section.row_label_header ?? 'Measurement'}</Text></View>
            {cols.map(c => (
              <View key={c.key} style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>{c.title}</Text></View>
            ))}
          </View>
          {allRows.map((row, idx) => (
            <View key={row.id} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.tableCell}><Text style={s.tableCellText}>{row.label}</Text></View>
              {cols.map(c => (
                <View key={c.key} style={s.tableCell}>
                  <Text style={s.tableCellText}>{cell(payload[k(section.id, row.id, c.key)])}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    case 'ir_fixed_phase': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const sectionRows = section.rows ?? [];
      const extraRows: Array<{ id: string; insulation: string; voltage: string; unit: string }> =
        payload[k(section.id, 'extra_rows')] ?? [];
      return (
        <View style={s.table}>
          {TitleRow}
          <View style={s.tableHeaderRow}>
            <View style={[s.tableHeaderCell, { maxWidth: 20 }]}><Text style={s.tableHeaderCellText}>Sr.</Text></View>
            <View style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>Insulation Tested</Text></View>
            <View style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>Applied Voltage</Text></View>
            <View style={[s.tableHeaderCell, { maxWidth: 28 }]}><Text style={s.tableHeaderCellText}>Unit</Text></View>
            {phases.map(p => (
              <View key={p} style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>{p} Phase</Text></View>
            ))}
          </View>
          {sectionRows.map((row, idx) => (
            <View key={row.id} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={[s.tableCell, { maxWidth: 20 }]}><Text style={s.tableCellText}>{row.sr ?? ''}</Text></View>
              <View style={s.tableCell}><Text style={s.tableCellText}>{row.insulation ?? ''}</Text></View>
              <View style={s.tableCell}><Text style={s.tableCellText}>{row.voltage ?? ''}</Text></View>
              <View style={[s.tableCell, { maxWidth: 28 }]}><Text style={s.tableCellText}>{row.unit ?? ''}</Text></View>
              {phases.map(ph => (
                <View key={ph} style={s.tableCell}>
                  <Text style={s.tableCellText}>{cell(payload[k(section.id, row.id, ph)])}</Text>
                </View>
              ))}
            </View>
          ))}
          {extraRows.map((row, idx) => (
            <View key={row.id} style={(sectionRows.length + idx) % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={[s.tableCell, { maxWidth: 20 }]}><Text style={s.tableCellText}></Text></View>
              <View style={s.tableCell}><Text style={s.tableCellText}>{row.insulation ?? ''}</Text></View>
              <View style={s.tableCell}><Text style={s.tableCellText}>{row.voltage ?? ''}</Text></View>
              <View style={[s.tableCell, { maxWidth: 28 }]}><Text style={s.tableCellText}>{row.unit ?? ''}</Text></View>
              {phases.map(ph => (
                <View key={ph} style={s.tableCell}>
                  <Text style={s.tableCellText}>{cell(payload[k(section.id, row.id, ph)])}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    case 'core_phase_table': {
      const cols = section.columns ?? [];
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const numCores = section.num_cores_default ?? 4;
      const allRows: Array<{ core: number; phase: string }> = [];
      for (let n = 1; n <= numCores; n++) {
        for (const ph of phases) allRows.push({ core: n, phase: ph });
      }
      return (
        <View style={s.table}>
          {TitleRow}
          <View style={s.tableHeaderRow}>
            <View style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>Core</Text></View>
            <View style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>Phase</Text></View>
            {cols.map(c => (
              <View key={c.key} style={s.tableHeaderCell}><Text style={s.tableHeaderCellText}>{c.title}</Text></View>
            ))}
          </View>
          {allRows.map(({ core, phase }, idx) => (
            <View key={`${core}-${phase}`} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.tableCell}><Text style={s.tableCellText}>Core {core}</Text></View>
              <View style={s.tableCell}><Text style={s.tableCellText}>{phase}</Text></View>
              {cols.map(c => (
                <View key={c.key} style={s.tableCell}>
                  <Text style={s.tableCellText}>{cell(payload[k(section.id, core, phase, c.key)])}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    default:
      return <Text style={s.noData}>{section.title ? `${section.title}: ` : ''}(section type "{section.type}" not rendered)</Text>;
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PDFTaskItem {
  id: string;
  status: string;
  testName: string;
  testCode: string;
  schema: TemplateSchema | null;
  payload: Record<string, any>;
  instrumentId: string | null;
  passFail: string | null;
  remarks: string | null;
  assignedEngineerName: string;
  assignedEngineerColor: string;
}

export interface PDFEquipmentGroup {
  id: string;
  label: string;
  equipmentType: string;
  nameplate: Record<string, any>;
  tasks: PDFTaskItem[];
}

export interface ProjectReportPDFProps {
  projectNumber: string;
  siteName: string;
  siteAddress: string | null;
  client: string | null;
  status: string;
  startDate: string | null;
  createdAt: string;
  managerName: string | null;
  progressStats: {
    total: number;
    approved: number;
    submitted: number;
    inProgress: number;
    draft: number;
  };
  equipmentGroups: PDFEquipmentGroup[];
  generatedAt: string;
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PageFooter({ projectNumber, generatedAt }: { projectNumber: string; generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{projectNumber} — {generatedAt}</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({ props }: { props: ProjectReportPDFProps }) {
  const { projectNumber, siteName, siteAddress, client, status, startDate, createdAt, managerName, progressStats, generatedAt } = props;
  const approvedPct = progressStats.total > 0 ? Math.round((progressStats.approved / progressStats.total) * 100) : 0;

  return (
    <Page size="A4" style={s.page}>
      <View style={s.pageHeader}>
        <View style={s.pageHeaderLeft}>
          <Text style={s.pageHeaderTitle}>TestFlow — Grid Control</Text>
          <Text style={s.pageHeaderSub}>Project Test Report</Text>
        </View>
        <Text style={s.pageHeaderRight}>{generatedAt}</Text>
      </View>

      <View style={s.content}>
        {/* Hero block */}
        <View style={s.coverHero}>
          <Text style={s.coverHeroNumber}>{projectNumber}</Text>
          <Text style={s.coverHeroSite}>{siteName}</Text>
          <View style={s.coverHeroStatus}>
            <Text style={s.coverHeroStatusText}>{status}</Text>
          </View>
        </View>

        {/* Project info grid */}
        <View style={s.infoGrid}>
          {[
            ['Site Name', siteName],
            ['Client', client ?? '—'],
            ['Site Address', siteAddress ?? '—'],
            ['Manager', managerName ?? '—'],
            ['Start Date', startDate ?? '—'],
            ['Created', createdAt],
          ].map(([label, value]) => (
            <View key={label} style={s.infoCell}>
              <Text style={s.infoCellLabel}>{label}</Text>
              <Text style={s.infoCellValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.divider} />

        {/* Progress */}
        <View style={s.progressSection}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>Tests Approved</Text>
            <Text style={s.progressValue}>{progressStats.approved} / {progressStats.total} ({approvedPct}%)</Text>
          </View>
          <View style={s.progressBarOuter}>
            <View style={[s.progressBarInner, { width: `${approvedPct}%` as any }]} />
          </View>
          <View style={s.progressPills}>
            <View style={s.progressPill}>
              <View style={[s.progressDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={s.progressPillText}>{progressStats.submitted} pending review</Text>
            </View>
            <View style={s.progressPill}>
              <View style={[s.progressDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={s.progressPillText}>{progressStats.inProgress} in progress</Text>
            </View>
            <View style={s.progressPill}>
              <View style={[s.progressDot, { backgroundColor: '#cbd5e1' }]} />
              <Text style={s.progressPillText}>{progressStats.draft} not started</Text>
            </View>
          </View>
        </View>
      </View>

      <PageFooter projectNumber={projectNumber} generatedAt={generatedAt} />
    </Page>
  );
}

// ─── Equipment Page ───────────────────────────────────────────────────────────

function EquipmentPage({ group, projectNumber, generatedAt }: { group: PDFEquipmentGroup; projectNumber: string; generatedAt: string }) {
  const nameplateFields = NAMEPLATE_FIELDS[group.equipmentType] ?? [];
  const hasNameplate = nameplateFields.some(f => group.nameplate?.[f.key] != null && group.nameplate[f.key] !== '');

  return (
    <Page size="A4" style={s.page} break>
      <View style={s.pageHeader}>
        <View style={s.pageHeaderLeft}>
          <Text style={s.pageHeaderTitle}>{projectNumber} — {group.label}</Text>
          <Text style={s.pageHeaderSub}>{group.equipmentType.replace(/_/g, ' ')}</Text>
        </View>
        <Text style={s.pageHeaderRight}>{generatedAt}</Text>
      </View>

      <View style={s.content}>
        {/* Equipment header */}
        <View style={s.equipHeader}>
          <Text style={s.equipHeaderLabel}>{group.label}</Text>
          <Text style={s.equipHeaderType}>{group.equipmentType.replace(/_/g, ' ')}</Text>
        </View>

        {/* Nameplate Details */}
        {nameplateFields.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={s.subSectionTitle}>Nameplate Details</Text>
            <View style={s.table}>
              {nameplateFields.map((f, idx) => (
                <View key={f.key} style={idx % 2 === 0 ? s.kvRow : s.kvRowAlt}>
                  <Text style={s.kvLabel}>{f.label}{f.unit ? ` (${f.unit})` : ''}</Text>
                  <Text style={s.kvValue}>
                    {hasNameplate ? cell(group.nameplate?.[f.key]) : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Testing Parameters */}
        <Text style={s.subSectionTitle}>Testing Parameters</Text>

        {group.tasks.map(task => (
          <View key={task.id} style={{ marginBottom: 10 }}>
            {/* Test block header */}
            <View style={s.testHeader}>
              <Text style={s.testHeaderName}>{task.testName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.testHeaderCode}>{task.testCode}</Text>
                <StatusPill status={task.status} />
              </View>
            </View>

            {/* Test meta */}
            <View style={s.testMeta}>
              <View style={s.testMetaItem}>
                <Text style={s.testMetaLabel}>Instrument:</Text>
                <Text style={s.testMetaValue}>{task.instrumentId ?? '—'}</Text>
              </View>
              <View style={s.testMetaItem}>
                <Text style={s.testMetaLabel}>Result:</Text>
                <Text style={s.testMetaValue}>{task.passFail ?? '—'}</Text>
              </View>
              <View style={s.testMetaItem}>
                <Text style={s.testMetaLabel}>Engineer:</Text>
                <View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: task.assignedEngineerColor, marginTop: 1, marginRight: 2 }]} />
                <Text style={s.testMetaValue}>{task.assignedEngineerName}</Text>
              </View>
              {task.remarks && (
                <View style={s.testMetaItem}>
                  <Text style={s.testMetaLabel}>Remarks:</Text>
                  <Text style={s.testMetaValue}>{task.remarks}</Text>
                </View>
              )}
            </View>

            {/* Sections */}
            {task.schema && task.schema.sections.map(section => (
              <PDFSectionTable key={section.id} section={section} payload={task.payload} />
            ))}

            {!task.schema && (
              <Text style={s.noData}>No parameter schema available for this test.</Text>
            )}
          </View>
        ))}
      </View>

      <PageFooter projectNumber={projectNumber} generatedAt={generatedAt} />
    </Page>
  );
}

// ─── Main Document ────────────────────────────────────────────────────────────

export function ProjectReportPDF(props: ProjectReportPDFProps) {
  const { projectNumber, generatedAt, equipmentGroups } = props;

  return (
    <Document title={`${projectNumber} Test Report`} author="TestFlow">
      <CoverPage props={props} />
      {equipmentGroups.map(group => (
        <EquipmentPage
          key={group.id}
          group={group}
          projectNumber={projectNumber}
          generatedAt={generatedAt}
        />
      ))}
    </Document>
  );
}
