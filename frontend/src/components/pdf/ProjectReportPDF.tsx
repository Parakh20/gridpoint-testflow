import React from 'react';
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { NAMEPLATE_FIELDS } from '@/lib/nameplateFields';
import type { Section, TemplateSchema } from '@/lib/testSectionTables';

// ─── Font registration ────────────────────────────────────────────────────────

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-400-normal.woff', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-600-normal.woff', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-700-normal.woff', fontWeight: 700 },
  ],
});

// ─── Equipment color map ──────────────────────────────────────────────────────

const EQUIPMENT_COLORS: Record<string, { primary: string; light: string }> = {
  POWER_TRANSFORMER: { primary: '#1d4ed8', light: '#dbeafe' },
  CT:               { primary: '#065f46', light: '#d1fae5' },
  CVT:              { primary: '#6b21a8', light: '#f3e8ff' },
  LA:               { primary: '#b45309', light: '#fef3c7' },
  SF6_BREAKER:      { primary: '#9f1239', light: '#ffe4e6' },
  ISOLATOR:         { primary: '#0e7490', light: '#cffafe' },
  VCB:              { primary: '#4d7c0f', light: '#ecfccb' },
  EARTH_PIT:        { primary: '#92400e', light: '#fef9c3' },
  VT:               { primary: '#1e3a5f', light: '#e0f2fe' },
};
const DEFAULT_EQ_COLOR = { primary: '#374151', light: '#f3f4f6' };

export function getEquipmentColor(equipmentType: string): { primary: string; light: string } {
  return EQUIPMENT_COLORS[equipmentType] ?? DEFAULT_EQ_COLOR;
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function getStatusStyle(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case 'DRAFT':       return { bg: '#e2e8f0', text: '#475569', label: 'Draft' };
    case 'IN_PROGRESS': return { bg: '#dbeafe', text: '#1d4ed8', label: 'In Progress' };
    case 'SUBMITTED':   return { bg: '#fef3c7', text: '#b45309', label: 'Pending Review' };
    case 'APPROVED':    return { bg: '#d1fae5', text: '#065f46', label: 'Approved' };
    case 'REWORK':      return { bg: '#ffe4e6', text: '#9f1239', label: 'Rework' };
    default:            return { bg: '#f3f4f6', text: '#374151', label: status };
  }
}

// ─── Landscape detection ──────────────────────────────────────────────────────

function maxSectionColumns(schema: TemplateSchema | null): number {
  if (!schema) return 0;
  let max = 0;
  for (const sec of schema.sections) {
    let c = 2;
    if (sec.type === 'phase_columns') c = 1 + (sec.phases?.length ?? 3);
    else if (sec.type === 'phase_rows') c = 1 + (sec.columns?.length ?? 2);
    else if (sec.type === 'tap_table') c = 1 + (sec.columns?.length ?? 2);
    else if (sec.type === 'dynamic_table') c = 1 + (sec.columns?.length ?? 2);
    else if (sec.type === 'core_table') c = 1 + (sec.columns?.length ?? 2);
    else if (sec.type === 'ir_fixed') c = 1 + (sec.columns?.length ?? 2);
    else if (sec.type === 'ir_fixed_phase') c = 4 + (sec.phases?.length ?? 3);
    else if (sec.type === 'core_phase_table') c = 2 + (sec.columns?.length ?? 2);
    if (c > max) max = c;
  }
  return max;
}

// ─── Color palette ────────────────────────────────────────────────────────────

const C = {
  navy:        '#0f172a',
  warmWhite:   '#fafaf9',
  warmOffWhite:'#f5f0eb',
  warmGrey:    '#78716c',
  slate:       '#1c1917',
  amber:       '#d97706',
  amberDark:   '#b45309',
  amberLight:  '#fef3c7',
  borderLight: '#e7e5e4',
  mutedSlate:  '#94a3b8',
  blue:        '#3b82f6',
  green:       '#10b981',
  red:         '#ef4444',
};

// ─── Static styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Page
  page: {
    fontFamily: 'Inter',
    fontSize: 8,
    color: C.slate,
    backgroundColor: C.warmWhite,
    paddingBottom: 44,
  },
  pageLandscape: {
    fontFamily: 'Inter',
    fontSize: 8,
    color: C.slate,
    backgroundColor: C.warmWhite,
    paddingBottom: 44,
  },

  // ── Footer (fixed)
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    borderTopWidth: 2,
    borderTopColor: C.amber,
    backgroundColor: C.warmWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  footerText: { fontSize: 7, color: C.warmGrey },
  footerCenter: { fontSize: 7, color: C.warmGrey, textAlign: 'center' },

  // ── Cover — navy section
  coverNavy: {
    height: 310,
    backgroundColor: C.navy,
    paddingHorizontal: 36,
    paddingTop: 30,
  },
  coverBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 2,
    borderLeftColor: C.amber,
    paddingLeft: 8,
    marginBottom: 36,
  },
  coverBrandName: { color: '#ffffff', fontSize: 13, fontWeight: 700 },
  coverBrandSub: { color: C.mutedSlate, fontSize: 7, marginTop: 2, letterSpacing: 1.5 },
  coverTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  coverDate: { color: C.mutedSlate, fontSize: 9 },

  // ── Cover — diagonal overlay (absolute)
  coverDiagonal: {
    position: 'absolute',
    top: 284,
    left: -20,
    width: 660,
    height: 50,
    backgroundColor: C.navy,
    transform: 'rotate(-2.2deg)',
  },

  // ── Cover — warm white content
  coverContent: { paddingHorizontal: 36, paddingTop: 20 },

  // ── Info card
  infoCard: {
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
  },
  infoCol: { flex: 1, paddingRight: 10 },
  infoLabel: { fontSize: 6.5, color: C.warmGrey, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  infoValue: { fontSize: 9.5, fontWeight: 700, color: C.slate, marginBottom: 10 },

  // ── Progress section
  progressSectionTitle: {
    fontSize: 7.5,
    color: C.warmGrey,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderLeftWidth: 3,
    borderLeftColor: C.amber,
    paddingLeft: 6,
    marginBottom: 8,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { fontSize: 7.5, color: C.warmGrey },
  progressValue: { fontSize: 7.5, fontWeight: 700, color: C.slate },
  progressBarOuter: {
    height: 10,
    backgroundColor: C.borderLight,
    borderRadius: 5,
    marginBottom: 10,
  },
  progressPills: { flexDirection: 'row', gap: 14 },
  progressPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressDot: { width: 7, height: 7, borderRadius: 3.5 },
  progressPillText: { fontSize: 7, color: C.warmGrey },

  // ── Cover footer strip
  coverFooterLine: {
    height: 1,
    backgroundColor: C.amber,
    marginTop: 14,
    marginHorizontal: 36,
  },
  coverFooterText: {
    fontSize: 7,
    color: C.warmGrey,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // ── Equipment page header bar
  eqHeaderBar: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  eqHeaderBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eqHeaderCode: { color: '#ffffff', fontSize: 14, fontWeight: 700 },
  eqHeaderType: { color: 'rgba(255,255,255,0.75)', fontSize: 9 },
  eqHeaderPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  eqHeaderPillText: { color: '#ffffff', fontSize: 7.5, fontWeight: 600 },
  eqHeaderStrip: { height: 3 },

  // ── Equipment content
  eqContent: { paddingHorizontal: 20, paddingTop: 12 },

  // ── Sub-section headers
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 10,
  },
  subSectionTitle: {
    fontSize: 7,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subSectionRule: { flex: 1, height: 1, marginLeft: 8 },

  // ── KV table (nameplate)
  kvTable: { borderLeftWidth: 3, marginBottom: 10 },
  kvHeaderRow: { flexDirection: 'row' },
  kvHeaderCell: { flex: 1, padding: '4 6' },
  kvHeaderText: { color: '#ffffff', fontSize: 7, fontWeight: 700 },
  kvRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  kvLabel: { width: '45%', padding: '3.5 6', fontSize: 7.5, color: C.warmGrey },
  kvValue: { flex: 1, padding: '3.5 6', fontSize: 7.5, color: C.slate, fontWeight: 600 },

  // ── Test block
  testBlock: { marginBottom: 10 },
  testHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5 8',
    borderBottomWidth: 1,
    marginBottom: 0,
  },
  testHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  testBullet: { width: 5, height: 5 },
  testName: { fontSize: 8.5, fontWeight: 700, color: C.slate },
  testCode: { fontSize: 7, fontWeight: 600 },
  testHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  testMetaBar: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
    marginBottom: 4,
  },
  testMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  testMetaLabel: { fontSize: 6.5, color: C.warmGrey },
  testMetaValue: { fontSize: 7, fontWeight: 600, color: C.slate },

  // ── Parameter tables
  paramTable: { marginBottom: 6 },
  paramHeaderRow: { flexDirection: 'row' },
  paramHeaderCell: { flex: 1, padding: '4 5' },
  paramHeaderCellText: { color: '#ffffff', fontSize: 6.5, fontWeight: 700, textAlign: 'center' },
  paramRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  paramCell: { flex: 1, padding: '3.5 5' },
  paramCellText: { fontSize: 7, color: C.slate },
  paramSectionSubHeader: {
    padding: '3 6',
    marginVertical: 2,
  },
  paramSectionSubHeaderText: { fontSize: 6.5, fontWeight: 700, color: '#ffffff' },
  noDataText: { fontSize: 7, fontStyle: 'italic', textAlign: 'center', padding: '6 0' },

  // ── Status badge
  statusBadge: { borderRadius: 3, paddingVertical: 2, paddingHorizontal: 5 },
  statusBadgeText: { fontSize: 6.5, fontWeight: 700 },

  // ── Engineer dot
  engRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  engDot: { width: 6, height: 6, borderRadius: 3 },
  engName: { fontSize: 7, color: C.slate },

  // ── Misc
  divider: { height: 1, backgroundColor: C.borderLight, marginVertical: 8 },
  gap4: { height: 4 },
  gap8: { height: 8 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const k = (...parts: (string | number)[]) => parts.join('__');
const cell = (v: unknown): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

// ─── Small components ─────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const st = getStatusStyle(status);
  return (
    <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
      <Text style={[s.statusBadgeText, { color: st.text }]}>{st.label}</Text>
    </View>
  );
}

function EngineerTag({ color, name }: { color: string; name: string }) {
  return (
    <View style={s.engRow}>
      <View style={[s.engDot, { backgroundColor: color }]} />
      <Text style={s.engName}>{name}</Text>
    </View>
  );
}

function PageFooter({
  projectNumber,
  siteName,
  generatedAt,
}: {
  projectNumber: string;
  siteName: string;
  generatedAt: string;
}) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{projectNumber} · {siteName}</Text>
      <Text style={s.footerCenter}>TestFlow Grid Control · {generatedAt}</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

// ─── Section table ────────────────────────────────────────────────────────────

function PDFSectionTable({
  section,
  payload,
  eqColor,
}: {
  section: Section;
  payload: Record<string, any>;
  eqColor: { primary: string; light: string };
}) {
  const HeaderRow = ({ children }: { children: React.ReactNode }) => (
    <View style={[s.paramHeaderRow, { backgroundColor: eqColor.primary }]}>{children}</View>
  );
  const HCell = ({ label, flex, maxWidth }: { label: string; flex?: number; maxWidth?: number }) => (
    <View style={[s.paramHeaderCell, flex !== undefined ? { flex } : {}, maxWidth !== undefined ? { maxWidth } : {}]}>
      <Text style={s.paramHeaderCellText}>{label}</Text>
    </View>
  );
  const DataRow = ({ idx, children }: { idx: number; children: React.ReactNode }) => (
    <View style={[s.paramRow, idx % 2 === 1 ? { backgroundColor: eqColor.light } : { backgroundColor: '#ffffff' }]}>
      {children}
    </View>
  );
  const DCell = ({ value, flex, maxWidth }: { value: unknown; flex?: number; maxWidth?: number }) => (
    <View style={[s.paramCell, flex !== undefined ? { flex } : {}, maxWidth !== undefined ? { maxWidth } : {}]}>
      <Text style={s.paramCellText}>{cell(value)}</Text>
    </View>
  );

  const SectionTitle = section.title ? (
    <View style={[s.paramSectionSubHeader, { backgroundColor: '#64748b' }]}>
      <Text style={s.paramSectionSubHeaderText}>{section.title}</Text>
    </View>
  ) : null;

  switch (section.type) {
    case 'fields': {
      const fields = section.fields ?? [];
      if (!fields.length) return null;
      return (
        <View style={s.paramTable}>
          {SectionTitle}
          {fields.map((f, idx) => (
            <DataRow key={f.key} idx={idx}>
              <View style={[s.paramCell, { flex: 2 }]}>
                <Text style={[s.paramCellText, { color: C.warmGrey }]}>
                  {f.title}{f.unit ? ` (${f.unit})` : ''}
                </Text>
              </View>
              <View style={[s.paramCell, { flex: 3 }]}>
                <Text style={[s.paramCellText, { fontWeight: 600 }]}>{cell(payload[k(section.id, f.key)])}</Text>
              </View>
            </DataRow>
          ))}
        </View>
      );
    }

    case 'phase_columns': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const fields = section.fields ?? [];
      return (
        <View style={s.paramTable}>
          {SectionTitle}
          <HeaderRow>
            <HCell label="Parameter" flex={2} />
            {phases.map(p => <HCell key={p} label={`Phase ${p}`} />)}
          </HeaderRow>
          {fields.map((f, idx) => (
            <DataRow key={f.key} idx={idx}>
              <DCell value={`${f.title}${f.unit ? ` (${f.unit})` : ''}`} flex={2} />
              {phases.map(ph => <DCell key={ph} value={payload[k(section.id, ph, f.key)]} />)}
            </DataRow>
          ))}
        </View>
      );
    }

    case 'phase_rows': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const cols = section.columns ?? [];
      return (
        <View style={s.paramTable}>
          {SectionTitle}
          <HeaderRow>
            <HCell label="Phase" />
            {cols.map(c => <HCell key={c.key} label={c.title} />)}
          </HeaderRow>
          {phases.map((ph, idx) => (
            <DataRow key={ph} idx={idx}>
              <DCell value={ph} />
              {cols.map(c => <DCell key={c.key} value={payload[k(section.id, ph, c.key)]} />)}
            </DataRow>
          ))}
        </View>
      );
    }

    case 'tap_table': {
      const extra = Number(payload[k(section.id, 'extra_tap_count')] ?? 0);
      const tapCount = (section.tap_count_default ?? 17) + extra;
      const cols = section.columns ?? [];
      return (
        <View style={s.paramTable}>
          {SectionTitle}
          <HeaderRow>
            <HCell label="Tap No." maxWidth={30} />
            {cols.map(c => <HCell key={c.key} label={c.title} />)}
          </HeaderRow>
          {Array.from({ length: tapCount }, (_, i) => i + 1).map((n, idx) => (
            <DataRow key={n} idx={idx}>
              <DCell value={n} maxWidth={30} />
              {cols.map(c => <DCell key={c.key} value={payload[k(section.id, `tap${n}`, c.key)]} />)}
            </DataRow>
          ))}
        </View>
      );
    }

    case 'dynamic_table': {
      const cols = section.columns ?? [];
      const rows: Record<string, any>[] = payload[k(section.id, 'rows')] ?? [];
      return (
        <View style={s.paramTable}>
          {SectionTitle}
          <HeaderRow>
            <HCell label="Sr." maxWidth={24} />
            {cols.map(c => <HCell key={c.key} label={c.title} />)}
          </HeaderRow>
          {rows.length === 0 ? (
            <View style={[s.paramRow, { backgroundColor: '#ffffff' }]}>
              <View style={s.paramCell}>
                <Text style={[s.noDataText, { color: eqColor.primary }]}>No data recorded</Text>
              </View>
            </View>
          ) : rows.map((row, idx) => (
            <DataRow key={idx} idx={idx}>
              <DCell value={idx + 1} maxWidth={24} />
              {cols.map(c => <DCell key={c.key} value={row[c.key]} />)}
            </DataRow>
          ))}
        </View>
      );
    }

    case 'core_table': {
      const extra = Number(payload[k(section.id, 'extra_core_count')] ?? 0);
      const numCores = (section.num_cores_default ?? 4) + extra;
      const cols = section.columns ?? [];
      return (
        <View style={s.paramTable}>
          {SectionTitle}
          <HeaderRow>
            <HCell label="Core No." maxWidth={40} />
            {cols.map(c => <HCell key={c.key} label={c.title} />)}
          </HeaderRow>
          {Array.from({ length: numCores }, (_, i) => i + 1).map((n, idx) => (
            <DataRow key={n} idx={idx}>
              <DCell value={n} maxWidth={40} />
              {cols.map(c => <DCell key={c.key} value={payload[k(section.id, `core${n}`, c.key)]} />)}
            </DataRow>
          ))}
        </View>
      );
    }

    case 'ir_fixed': {
      const sectionRows = section.rows ?? [];
      const cols = section.columns ?? [];
      const extraRows: Array<{ id: string; label: string }> = payload[k(section.id, 'extra_rows')] ?? [];
      const allRows = [
        ...sectionRows.map(r => ({ id: r.id, label: r.label ?? r.insulation ?? r.parameter ?? '' })),
        ...extraRows,
      ];
      return (
        <View style={s.paramTable}>
          {SectionTitle}
          <HeaderRow>
            <HCell label={section.row_label_header ?? 'Measurement'} flex={2} />
            {cols.map(c => <HCell key={c.key} label={c.title} />)}
          </HeaderRow>
          {allRows.map((row, idx) => (
            <DataRow key={row.id} idx={idx}>
              <DCell value={row.label} flex={2} />
              {cols.map(c => <DCell key={c.key} value={payload[k(section.id, row.id, c.key)]} />)}
            </DataRow>
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
        <View style={s.paramTable}>
          {SectionTitle}
          <HeaderRow>
            <HCell label="Sr." maxWidth={18} />
            <HCell label="Insulation Tested" flex={2} />
            <HCell label="Applied Voltage" />
            <HCell label="Unit" maxWidth={26} />
            {phases.map(p => <HCell key={p} label={`${p} Phase`} />)}
          </HeaderRow>
          {[...sectionRows.map(r => ({
            id: r.id, sr: r.sr ?? '', ins: r.insulation ?? '', vol: r.voltage ?? '', unit: r.unit ?? '',
          })), ...extraRows.map(r => ({
            id: r.id, sr: '', ins: r.insulation ?? '', vol: r.voltage ?? '', unit: r.unit ?? '',
          }))].map((row, idx) => (
            <DataRow key={row.id} idx={idx}>
              <DCell value={row.sr} maxWidth={18} />
              <DCell value={row.ins} flex={2} />
              <DCell value={row.vol} />
              <DCell value={row.unit} maxWidth={26} />
              {phases.map(ph => <DCell key={ph} value={payload[k(section.id, row.id, ph)]} />)}
            </DataRow>
          ))}
        </View>
      );
    }

    case 'core_phase_table': {
      const cols = section.columns ?? [];
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const numCores = section.num_cores_default ?? 4;
      const allRows: Array<{ core: number; phase: string }> = [];
      for (let n = 1; n <= numCores; n++)
        for (const ph of phases) allRows.push({ core: n, phase: ph });
      return (
        <View style={s.paramTable}>
          {SectionTitle}
          <HeaderRow>
            <HCell label="Core" />
            <HCell label="Phase" />
            {cols.map(c => <HCell key={c.key} label={c.title} />)}
          </HeaderRow>
          {allRows.map(({ core, phase }, idx) => (
            <DataRow key={`${core}-${phase}`} idx={idx}>
              <DCell value={`Core ${core}`} />
              <DCell value={phase} />
              {cols.map(c => <DCell key={c.key} value={payload[k(section.id, core, phase, c.key)]} />)}
            </DataRow>
          ))}
        </View>
      );
    }

    default:
      return (
        <View style={s.paramTable}>
          {SectionTitle}
          <Text style={[s.noDataText, { color: eqColor.primary }]}>
            ({section.type} — not rendered)
          </Text>
        </View>
      );
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

// ─── Cover page ───────────────────────────────────────────────────────────────

function CoverPage({ props }: { props: ProjectReportPDFProps }) {
  const { projectNumber, siteName, siteAddress, client, status, startDate, createdAt, managerName, progressStats, generatedAt } = props;
  const { approved, total, submitted, inProgress, draft } = progressStats;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const barColor = pct >= 70 ? C.green : pct >= 30 ? C.amber : C.red;
  const statusSt = getStatusStyle(status);

  return (
    <Page size="A4" style={s.page}>
      {/* ── Navy top section */}
      <View style={s.coverNavy}>
        {/* Branding */}
        <View style={s.coverBrand}>
          <View>
            <Text style={s.coverBrandName}>TestFlow</Text>
            <Text style={s.coverBrandSub}>GRID CONTROL</Text>
          </View>
        </View>
        {/* Title */}
        <Text style={s.coverTitle}>PROJECT TEST{'\n'}REPORT</Text>
        <Text style={s.coverDate}>{generatedAt}</Text>
      </View>

      {/* ── Diagonal overlay */}
      <View style={s.coverDiagonal} />

      {/* ── Warm white content */}
      <View style={s.coverContent}>
        {/* Project details card */}
        <View style={s.infoCard}>
          {/* Col 1 */}
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Project Number</Text>
            <Text style={s.infoValue}>{projectNumber}</Text>
            <Text style={s.infoLabel}>Site Name</Text>
            <Text style={s.infoValue}>{siteName}</Text>
            <Text style={s.infoLabel}>Site Address</Text>
            <Text style={s.infoValue}>{siteAddress ?? '—'}</Text>
          </View>
          {/* Col 2 */}
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Client</Text>
            <Text style={s.infoValue}>{client ?? '—'}</Text>
            <Text style={s.infoLabel}>Manager</Text>
            <Text style={s.infoValue}>{managerName ?? '—'}</Text>
            <Text style={s.infoLabel}>Start Date</Text>
            <Text style={s.infoValue}>{startDate ?? '—'}</Text>
          </View>
          {/* Col 3 */}
          <View style={[s.infoCol, { paddingRight: 0 }]}>
            <Text style={s.infoLabel}>Status</Text>
            <View style={{ marginBottom: 10 }}>
              <View style={[s.statusBadge, { backgroundColor: statusSt.bg, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8 }]}>
                <Text style={[s.statusBadgeText, { color: statusSt.text, fontSize: 9 }]}>{statusSt.label}</Text>
              </View>
            </View>
            <Text style={s.infoLabel}>Created</Text>
            <Text style={s.infoValue}>{createdAt}</Text>
          </View>
        </View>

        {/* Progress section */}
        <Text style={s.progressSectionTitle}>TEST PROGRESS</Text>
        <View style={s.progressRow}>
          <Text style={s.progressLabel}>Tests Approved</Text>
          <Text style={s.progressValue}>{approved} / {total} ({pct}%)</Text>
        </View>
        <View style={s.progressBarOuter}>
          <View style={{ height: 10, width: `${pct}%` as any, backgroundColor: barColor, borderRadius: 5 }} />
        </View>
        <View style={s.progressPills}>
          {[
            { dot: C.amber, label: `${submitted} Pending Review` },
            { dot: C.blue,  label: `${inProgress} In Progress` },
            { dot: '#94a3b8', label: `${draft} Not Started` },
            { dot: C.green, label: `${approved} Approved` },
          ].map(({ dot, label }) => (
            <View key={label} style={s.progressPill}>
              <View style={[s.progressDot, { backgroundColor: dot }]} />
              <Text style={s.progressPillText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Cover footer */}
      <View style={s.coverFooterLine} />
      <Text style={s.coverFooterText}>Confidential — For Internal Use Only</Text>

      <PageFooter projectNumber={projectNumber} siteName={siteName} generatedAt={generatedAt} />
    </Page>
  );
}

// ─── Equipment page ───────────────────────────────────────────────────────────

function EquipmentPage({
  group,
  projectNumber,
  siteName,
  generatedAt,
}: {
  group: PDFEquipmentGroup;
  projectNumber: string;
  siteName: string;
  generatedAt: string;
}) {
  const eqColor = getEquipmentColor(group.equipmentType);
  const npFields = NAMEPLATE_FIELDS[group.equipmentType] ?? [];
  const approvedCount = group.tasks.filter(t => t.status === 'APPROVED').length;
  const isLandscape = group.tasks.some(t => maxSectionColumns(t.schema) > 7);

  const pageStyle = isLandscape
    ? [s.pageLandscape, { paddingBottom: 44 }]
    : s.page;

  return (
    <Page
      size="A4"
      orientation={isLandscape ? 'landscape' : 'portrait'}
      style={pageStyle}
      break
    >
      {/* ── Equipment header bar */}
      <View style={[s.eqHeaderBar, { backgroundColor: eqColor.primary }]}>
        <View style={s.eqHeaderBarLeft}>
          <Text style={s.eqHeaderCode}>{group.label}</Text>
          <Text style={s.eqHeaderType}>  —  {group.equipmentType.replace(/_/g, ' ')}</Text>
        </View>
        <View style={s.eqHeaderPill}>
          <Text style={s.eqHeaderPillText}>{approvedCount}/{group.tasks.length} approved</Text>
        </View>
      </View>
      {/* Color accent strip below header */}
      <View style={[s.eqHeaderStrip, { backgroundColor: eqColor.light }]} />

      <View style={s.eqContent}>
        {/* ── Nameplate Details */}
        {npFields.length > 0 && (
          <View>
            <View style={s.subSectionHeader}>
              <Text style={[s.subSectionTitle, { color: eqColor.primary }]}>Nameplate Details</Text>
              <View style={[s.subSectionRule, { backgroundColor: eqColor.primary }]} />
            </View>
            <View style={[s.kvTable, { borderLeftColor: eqColor.primary }]}>
              {/* Header */}
              <View style={[s.kvHeaderRow, { backgroundColor: eqColor.primary }]}>
                <View style={[s.kvHeaderCell, { flex: 2 }]}><Text style={s.kvHeaderText}>Field</Text></View>
                <View style={[s.kvHeaderCell, { flex: 3 }]}><Text style={s.kvHeaderText}>Value</Text></View>
              </View>
              {npFields.map((f, idx) => (
                <View
                  key={f.key}
                  style={[s.kvRow, idx % 2 === 1 ? { backgroundColor: eqColor.light } : { backgroundColor: '#ffffff' }]}
                >
                  <Text style={s.kvLabel}>{f.label}{f.unit ? ` (${f.unit})` : ''}</Text>
                  <Text style={s.kvValue}>
                    {cell(group.nameplate?.[f.key])}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Testing Parameters */}
        <View style={s.subSectionHeader}>
          <Text style={[s.subSectionTitle, { color: eqColor.primary }]}>Testing Parameters</Text>
          <View style={[s.subSectionRule, { backgroundColor: eqColor.primary }]} />
        </View>

        {group.tasks.map(task => (
          <View key={task.id} style={s.testBlock}>
            {/* Test header strip */}
            <View style={[s.testHeaderStrip, { backgroundColor: eqColor.light, borderBottomColor: eqColor.primary }]}>
              <View style={s.testHeaderLeft}>
                <View style={[s.testBullet, { backgroundColor: eqColor.primary }]} />
                <Text style={s.testName}>{task.testName}</Text>
                <Text style={[s.testCode, { color: eqColor.primary }]}> · {task.testCode}</Text>
              </View>
              <View style={s.testHeaderRight}>
                <StatusPill status={task.status} />
                <EngineerTag color={task.assignedEngineerColor} name={task.assignedEngineerName} />
              </View>
            </View>

            {/* Meta bar */}
            <View style={s.testMetaBar}>
              {task.instrumentId && (
                <View style={s.testMetaItem}>
                  <Text style={s.testMetaLabel}>Instrument:</Text>
                  <Text style={s.testMetaValue}>{task.instrumentId}</Text>
                </View>
              )}
              {task.passFail && (
                <View style={s.testMetaItem}>
                  <Text style={s.testMetaLabel}>Result:</Text>
                  <Text style={[s.testMetaValue, {
                    color: task.passFail === 'PASS' ? '#065f46' : task.passFail === 'FAIL' ? '#9f1239' : C.amberDark
                  }]}>
                    {task.passFail}
                  </Text>
                </View>
              )}
              {task.remarks && (
                <View style={s.testMetaItem}>
                  <Text style={s.testMetaLabel}>Remarks:</Text>
                  <Text style={s.testMetaValue}>{task.remarks}</Text>
                </View>
              )}
            </View>

            {/* Section tables */}
            {task.schema && task.schema.sections.map(sec => (
              <PDFSectionTable key={sec.id} section={sec} payload={task.payload} eqColor={eqColor} />
            ))}
            {!task.schema && (
              <Text style={[s.noDataText, { color: eqColor.primary }]}>
                No parameter schema available for this test.
              </Text>
            )}
          </View>
        ))}
      </View>

      <PageFooter projectNumber={projectNumber} siteName={siteName} generatedAt={generatedAt} />
    </Page>
  );
}

// ─── Main Document ────────────────────────────────────────────────────────────

export function ProjectReportPDF(props: ProjectReportPDFProps) {
  const { projectNumber, siteName, generatedAt, equipmentGroups } = props;
  return (
    <Document title={`${projectNumber} Test Report`} author="TestFlow">
      <CoverPage props={props} />
      {equipmentGroups.map(group => (
        <EquipmentPage
          key={group.id}
          group={group}
          projectNumber={projectNumber}
          siteName={siteName}
          generatedAt={generatedAt}
        />
      ))}
    </Document>
  );
}
