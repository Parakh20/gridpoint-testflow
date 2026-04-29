/**
 * testSectionTables.tsx
 *
 * Renders the same per-section data tables that projectExcelExport.ts
 * produces for the Excel workbook, but as React/HTML so they can appear
 * in the PDF export. Logic must stay in lock-step with renderSection in
 * projectExcelExport.ts so PDF and Excel show identical content.
 */

import React from 'react';

interface ColDef { key: string; title: string; }
interface FieldDef { key: string; title: string; unit?: string; }
interface RowDef {
  id: string;
  sr?: string;
  label?: string;
  parameter?: string;
  insulation?: string;
  voltage?: string;
  unit?: string;
}

export interface Section {
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

export interface TemplateSchema {
  version: number;
  sections: Section[];
}

const k = (...parts: (string | number)[]) => parts.join('__');

const cell = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11,
  marginBottom: 8,
};
const thStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#f1f5f9',
  padding: '4px 6px',
  textAlign: 'left',
  fontWeight: 600,
};
const tdStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  padding: '4px 6px',
  verticalAlign: 'top',
};

export function SectionTable({ section, payload }: { section: Section; payload: Record<string, any> }) {
  const title = section.title ? (
    <div style={{ fontWeight: 600, fontSize: 12, margin: '8px 0 4px', color: '#0f172a' }}>{section.title}</div>
  ) : null;

  switch (section.type) {
    case 'fields': {
      const fields = section.fields ?? [];
      if (!fields.length) return null;
      return (
        <div>
          {title}
          <table style={tableStyle}>
            <tbody>
              {fields.map(f => (
                <tr key={f.key}>
                  <td style={{ ...tdStyle, width: '50%' }}>
                    {f.title}{f.unit ? ` (${f.unit})` : ''}
                  </td>
                  <td style={tdStyle}>{cell(payload[k(section.id, f.key)])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'phase_columns': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const fields = section.fields ?? [];
      return (
        <div>
          {title}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Parameter</th>
                {phases.map(p => <th key={p} style={thStyle}>Phase {p}</th>)}
              </tr>
            </thead>
            <tbody>
              {fields.map(f => (
                <tr key={f.key}>
                  <td style={tdStyle}>{f.title}</td>
                  {phases.map(ph => (
                    <td key={ph} style={tdStyle}>{cell(payload[k(section.id, ph, f.key)])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'phase_rows': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const cols = section.columns ?? [];
      return (
        <div>
          {title}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Phase</th>
                {cols.map(c => <th key={c.key} style={thStyle}>{c.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {phases.map(ph => (
                <tr key={ph}>
                  <td style={tdStyle}>{ph}</td>
                  {cols.map(c => (
                    <td key={c.key} style={tdStyle}>{cell(payload[k(section.id, ph, c.key)])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'tap_table': {
      const extra = Number(payload[k(section.id, 'extra_tap_count')] ?? 0);
      const tapCount = (section.tap_count_default ?? 17) + extra;
      const cols = section.columns ?? [];
      return (
        <div>
          {title}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Tap No.</th>
                {cols.map(c => <th key={c.key} style={thStyle}>{c.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: tapCount }, (_, i) => i + 1).map(n => (
                <tr key={n}>
                  <td style={tdStyle}>{n}</td>
                  {cols.map(c => (
                    <td key={c.key} style={tdStyle}>{cell(payload[k(section.id, `tap${n}`, c.key)])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'dynamic_table': {
      const cols = section.columns ?? [];
      const rows: Record<string, any>[] = payload[k(section.id, 'rows')] ?? [];
      return (
        <div>
          {title}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Sr.</th>
                {cols.map(c => <th key={c.key} style={thStyle}>{c.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td style={tdStyle} colSpan={cols.length + 1}>No rows</td></tr>
              ) : rows.map((row, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{i + 1}</td>
                  {cols.map(c => <td key={c.key} style={tdStyle}>{cell(row[c.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'core_table': {
      const extra = Number(payload[k(section.id, 'extra_core_count')] ?? 0);
      const numCores = (section.num_cores_default ?? 4) + extra;
      const cols = section.columns ?? [];
      return (
        <div>
          {title}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Core No.</th>
                {cols.map(c => <th key={c.key} style={thStyle}>{c.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numCores }, (_, i) => i + 1).map(n => (
                <tr key={n}>
                  <td style={tdStyle}>{n}</td>
                  {cols.map(c => (
                    <td key={c.key} style={tdStyle}>{cell(payload[k(section.id, `core${n}`, c.key)])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'ir_fixed': {
      const sectionRows = section.rows ?? [];
      const cols = section.columns ?? [];
      const extraRows: Array<{ id: string; label: string }> = payload[k(section.id, 'extra_rows')] ?? [];
      return (
        <div>
          {title}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{section.row_label_header ?? 'Measurement'}</th>
                {cols.map(c => <th key={c.key} style={thStyle}>{c.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {sectionRows.map(row => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.label ?? row.insulation ?? row.parameter ?? ''}</td>
                  {cols.map(c => (
                    <td key={c.key} style={tdStyle}>{cell(payload[k(section.id, row.id, c.key)])}</td>
                  ))}
                </tr>
              ))}
              {extraRows.map(row => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.label ?? ''}</td>
                  {cols.map(c => (
                    <td key={c.key} style={tdStyle}>{cell(payload[k(section.id, row.id, c.key)])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'ir_fixed_phase': {
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const sectionRows = section.rows ?? [];
      const extraRows: Array<{ id: string; insulation: string; voltage: string; unit: string }> =
        payload[k(section.id, 'extra_rows')] ?? [];
      return (
        <div>
          {title}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Sr.</th>
                <th style={thStyle}>Insulation Tested</th>
                <th style={thStyle}>Applied Voltage</th>
                <th style={thStyle}>Unit</th>
                {phases.map(p => <th key={p} style={thStyle}>{p} Phase</th>)}
              </tr>
            </thead>
            <tbody>
              {sectionRows.map(row => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.sr ?? ''}</td>
                  <td style={tdStyle}>{row.insulation ?? ''}</td>
                  <td style={tdStyle}>{row.voltage ?? ''}</td>
                  <td style={tdStyle}>{row.unit ?? ''}</td>
                  {phases.map(ph => (
                    <td key={ph} style={tdStyle}>{cell(payload[k(section.id, row.id, ph)])}</td>
                  ))}
                </tr>
              ))}
              {extraRows.map(row => (
                <tr key={row.id}>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}>{row.insulation ?? ''}</td>
                  <td style={tdStyle}>{row.voltage ?? ''}</td>
                  <td style={tdStyle}>{row.unit ?? ''}</td>
                  {phases.map(ph => (
                    <td key={ph} style={tdStyle}>{cell(payload[k(section.id, row.id, ph)])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'core_phase_table': {
      const cols = section.columns ?? [];
      const phases = section.phases ?? ['R', 'Y', 'B'];
      const numCores = section.num_cores_default ?? 4;
      const rows: React.ReactNode[] = [];
      for (let n = 1; n <= numCores; n++) {
        for (const ph of phases) {
          rows.push(
            <tr key={`${n}-${ph}`}>
              <td style={tdStyle}>Core {n}</td>
              <td style={tdStyle}>{ph}</td>
              {cols.map(c => (
                <td key={c.key} style={tdStyle}>{cell(payload[k(section.id, n, ph, c.key)])}</td>
              ))}
            </tr>
          );
        }
      }
      return (
        <div>
          {title}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Core</th>
                <th style={thStyle}>Phase</th>
                {cols.map(c => <th key={c.key} style={thStyle}>{c.title}</th>)}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      );
    }

    default:
      return (
        <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', marginBottom: 8 }}>
          {title}({section.type} — not rendered)
        </div>
      );
  }
}

export function isV2Schema(fields: unknown): fields is TemplateSchema {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return false;
  const f = fields as TemplateSchema;
  return f.version === 2 && Array.isArray(f.sections);
}
