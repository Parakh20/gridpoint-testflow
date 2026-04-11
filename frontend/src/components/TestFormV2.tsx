/**
 * TestFormV2 — renderer for version-2 section-based test template schemas.
 *
 * Supported section types:
 *   fields           → simple labeled inputs (string / number / enum / date)
 *   phase_columns    → field rows with phase (R/Y/B/…) sub-columns
 *   phase_rows       → phase rows with typed measurement columns
 *   tap_table        → fixed tap rows (1..tap_count_default)
 *   dynamic_table    → user-controlled row count
 *   core_table       → fixed core rows (1..num_cores)
 *   core_phase_table → core × phase matrix, each cell has sub-columns
 *   phase_core_upload→ phase × core upload grid
 *   ir_fixed         → predefined test rows, columns: 60s / 600s / PI
 *   ir_fixed_phase   → predefined test rows, per-phase value columns
 *
 * Data storage convention (all keys flat inside formData[taskId]):
 *   fields           → {sectionId}__{fieldKey}
 *   phase_columns    → {sectionId}__{phase}__{fieldKey}
 *   phase_rows       → {sectionId}__{phase}__{colKey}
 *   tap_table        → {sectionId}__tap{n}__{colKey}
 *   dynamic_table    → {sectionId}__rows  (value = array of row objects)
 *   core_table       → {sectionId}__core{n}__{colKey}
 *   core_phase_table → {sectionId}__{coreIdx}__{phase}__{colKey}
 *   ir_fixed         → {sectionId}__{rowId}__{colKey}
 *   ir_fixed_phase   → {sectionId}__{rowId}__{phase}
 *   phase_core_upload→ {sectionId}__{phase}__{coreLabel}
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  title: string;
  type: 'string' | 'number' | 'enum' | 'date';
  enum?: string[];
  unit?: string;
  required?: boolean;
  default?: string | number;
  calculated?: boolean;
  formula?: string;
}

interface ColDef {
  key: string;
  title: string;
  type: 'string' | 'number' | 'enum';
  enum?: string[];
  calculated?: boolean;
  formula?: string;
}

interface RowDef {
  id: string;
  sr?: string;
  label?: string;
  parameter?: string;
  insulation?: string;
  voltage?: string;
  unit?: string;
}

interface Section {
  id: string;
  title: string;
  note?: string;
  type:
    | 'fields'
    | 'phase_columns'
    | 'phase_rows'
    | 'tap_table'
    | 'dynamic_table'
    | 'core_table'
    | 'core_phase_table'
    | 'phase_core_upload'
    | 'ir_fixed'
    | 'ir_fixed_phase';
  // fields / phase_columns / phase_rows
  fields?: FieldDef[];
  phases?: string[];
  columns?: ColDef[];
  // tap_table
  tap_count_default?: number;
  // dynamic_table
  default_rows?: number;
  max_rows?: number;
  row_prompt?: string;
  // core_table
  num_cores_from_field?: string;
  num_cores_default?: number;
  // core_phase_table
  cores?: string[];
  // ir_fixed / ir_fixed_phase
  rows?: RowDef[];
  row_label_header?: string;  // overrides the default "Insulation / Measurement" column title
}

interface Props {
  taskId: string;
  sections: Section[];
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
  isReadonly: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const k = (...parts: (string | number)[]) => parts.join('__');

function FieldInput({
  fieldKey,
  def,
  value,
  onChange,
  isReadonly,
}: {
  fieldKey: string;
  def: FieldDef | ColDef;
  value: any;
  onChange: (v: any) => void;
  isReadonly: boolean;
}) {
  if ('enum' in def && def.enum) {
    return (
      <Select
        value={value ?? ''}
        onValueChange={onChange}
        disabled={isReadonly}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {def.enum.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      className="h-8 text-xs"
      type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
      value={value ?? ''}
      onChange={(e) =>
        onChange(
          def.type === 'number'
            ? e.target.value === ''
              ? ''
              : parseFloat(e.target.value)
            : e.target.value,
        )
      }
      disabled={isReadonly || ('calculated' in def && def.calculated)}
      placeholder={def.title}
    />
  );
}

// ─── Section Renderers ─────────────────────────────────────────────────────

function FieldsSection({ section, taskId, formData, onChange, isReadonly }: Props & { section: Section }) {
  if (!section.fields?.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {section.fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">
            {f.title}
            {f.unit ? ` (${f.unit})` : ''}
            {f.required ? ' *' : ''}
          </Label>
          <FieldInput
            fieldKey={f.key}
            def={f}
            value={formData[k(section.id, f.key)]}
            onChange={(v) => onChange(k(section.id, f.key), v)}
            isReadonly={isReadonly}
          />
        </div>
      ))}
    </div>
  );
}

function PhaseColumnsSection({ section, taskId, formData, onChange, isReadonly }: Props & { section: Section }) {
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const fields = section.fields ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border px-2 py-1 text-left w-36">Field</th>
            {phases.map((ph) => (
              <th key={ph} className="border px-2 py-1 text-center font-semibold">
                Phase {ph}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.key} className="even:bg-muted/30">
              <td className="border px-2 py-1 font-medium text-muted-foreground">{f.title}</td>
              {phases.map((ph) => (
                <td key={ph} className="border px-1 py-1">
                  <FieldInput
                    fieldKey={k(section.id, ph, f.key)}
                    def={f}
                    value={formData[k(section.id, ph, f.key)]}
                    onChange={(v) => onChange(k(section.id, ph, f.key), v)}
                    isReadonly={isReadonly}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhaseRowsSection({ section, taskId, formData, onChange, isReadonly }: Props & { section: Section }) {
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const cols = section.columns ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border px-2 py-1 text-left w-16">Phase</th>
            {cols.map((c) => (
              <th key={c.key} className="border px-2 py-1 text-center">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {phases.map((ph) => (
            <tr key={ph} className="even:bg-muted/30">
              <td className="border px-2 py-1 font-semibold text-center">{ph}</td>
              {cols.map((c) => (
                <td key={c.key} className="border px-1 py-1">
                  <FieldInput
                    fieldKey={k(section.id, ph, c.key)}
                    def={c}
                    value={formData[k(section.id, ph, c.key)]}
                    onChange={(v) => onChange(k(section.id, ph, c.key), v)}
                    isReadonly={isReadonly}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TapTableSection({ section, taskId, formData, onChange, isReadonly }: Props & { section: Section }) {
  const tapCount = section.tap_count_default ?? 17;
  const cols = section.columns ?? [];
  const taps = Array.from({ length: tapCount }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border px-2 py-1 text-center w-16">Tap No.</th>
            {cols.map((c) => (
              <th key={c.key} className="border px-2 py-1 text-center">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {taps.map((n) => (
            <tr key={n} className="even:bg-muted/30">
              <td className="border px-2 py-1 font-semibold text-center">{n}</td>
              {cols.map((c) => (
                <td key={c.key} className="border px-1 py-1">
                  <FieldInput
                    fieldKey={k(section.id, `tap${n}`, c.key)}
                    def={c}
                    value={formData[k(section.id, `tap${n}`, c.key)]}
                    onChange={(v) => onChange(k(section.id, `tap${n}`, c.key), v)}
                    isReadonly={isReadonly}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DynamicTableSection({ section, taskId, formData, onChange, isReadonly }: Props & { section: Section }) {
  const cols = section.columns ?? [];
  const rowsKey = k(section.id, 'rows');
  const storedRows: Record<string, any>[] = formData[rowsKey] ?? [];

  // Initialise default rows on first render if nothing stored yet
  const defaultCount = section.default_rows ?? 1;
  const rows: Record<string, any>[] =
    storedRows.length > 0
      ? storedRows
      : Array.from({ length: defaultCount }, () => ({}));

  const updateRow = (idx: number, colKey: string, value: any) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [colKey]: value } : r));
    onChange(rowsKey, next);
  };

  const addRow = () => {
    if (section.max_rows && rows.length >= section.max_rows) return;
    onChange(rowsKey, [...rows, {}]);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    onChange(rowsKey, rows.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {section.row_prompt && (
        <p className="text-xs text-muted-foreground italic">{section.row_prompt}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border px-1 py-1 w-8">#</th>
              {cols.map((c) => (
                <th key={c.key} className="border px-2 py-1 text-center">
                  {c.title}
                </th>
              ))}
              {!isReadonly && <th className="border px-1 py-1 w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="even:bg-muted/30">
                <td className="border px-2 py-1 text-center text-muted-foreground">{idx + 1}</td>
                {cols.map((c) => (
                  <td key={c.key} className="border px-1 py-1">
                    <FieldInput
                      fieldKey={`${idx}_${c.key}`}
                      def={c}
                      value={row[c.key]}
                      onChange={(v) => updateRow(idx, c.key, v)}
                      isReadonly={isReadonly}
                    />
                  </td>
                ))}
                {!isReadonly && (
                  <td className="border px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isReadonly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={!!(section.max_rows && rows.length >= section.max_rows)}
          className="text-xs h-7"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Row
          {section.max_rows ? ` (max ${section.max_rows})` : ''}
        </Button>
      )}
    </div>
  );
}

function CoreTableSection({ section, taskId, formData, onChange, isReadonly }: Props & { section: Section }) {
  const cols = section.columns ?? [];
  // num_cores may be driven by a sibling fields section
  const numCoresRaw = section.num_cores_from_field
    ? formData[k(section.id.replace('core_table', 'core_count_header'), section.num_cores_from_field)] ??
      formData[`core_count_header__${section.num_cores_from_field}`]
    : null;
  const numCores = parseInt(numCoresRaw ?? section.num_cores_default ?? '4', 10) || 4;
  const coreRows = Array.from({ length: numCores }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border px-2 py-1 text-center w-20">Core No.</th>
            {cols.map((c) => (
              <th key={c.key} className="border px-2 py-1 text-center">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {coreRows.map((n) => (
            <tr key={n} className="even:bg-muted/30">
              <td className="border px-2 py-1 font-semibold text-center">{n}</td>
              {cols.map((c) => (
                <td key={c.key} className="border px-1 py-1">
                  <FieldInput
                    fieldKey={k(section.id, `core${n}`, c.key)}
                    def={c}
                    value={formData[k(section.id, `core${n}`, c.key)]}
                    onChange={(v) => onChange(k(section.id, `core${n}`, c.key), v)}
                    isReadonly={isReadonly}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CorePhaseTableSection({ section, taskId, formData, onChange, isReadonly }: Props & { section: Section }) {
  const cores = section.cores ?? ['1S1 – 1S2', '2S1 – 2S2', '3S1 – 3S2', '4S1 – 4S2'];
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const cols = section.columns ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border px-2 py-1 text-left w-28">Core Winding</th>
            {phases.map((ph) => (
              <th
                key={ph}
                className="border px-2 py-1 text-center"
                colSpan={cols.length}
              >
                Phase {ph}
              </th>
            ))}
          </tr>
          <tr className="bg-muted/60">
            <th className="border px-2 py-1" />
            {phases.map((ph) =>
              cols.map((c) => (
                <th key={`${ph}_${c.key}`} className="border px-2 py-1 text-center text-[10px]">
                  {c.title}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {cores.map((core, cIdx) => (
            <tr key={core} className="even:bg-muted/30">
              <td className="border px-2 py-1 font-medium text-muted-foreground">{core}</td>
              {phases.map((ph) =>
                cols.map((c) => (
                  <td key={`${ph}_${c.key}`} className="border px-1 py-1">
                    <FieldInput
                      fieldKey={k(section.id, `${cIdx}`, ph, c.key)}
                      def={c}
                      value={formData[k(section.id, `${cIdx}`, ph, c.key)]}
                      onChange={(v) => onChange(k(section.id, `${cIdx}`, ph, c.key), v)}
                      isReadonly={isReadonly}
                    />
                  </td>
                )),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhaseCoreUploadSection({ section, taskId, formData, onChange, isReadonly }: Props & { section: Section }) {
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const cores = section.cores ?? ['Core 1', 'Core 2', 'Core 3', 'Core 4'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border px-2 py-1 text-left w-20">Phase</th>
            {cores.map((c) => (
              <th key={c} className="border px-2 py-1 text-center">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {phases.map((ph) => (
            <tr key={ph} className="even:bg-muted/30">
              <td className="border px-2 py-1 font-semibold text-center">{ph}</td>
              {cores.map((core) => (
                <td key={core} className="border px-1 py-1">
                  <Input
                    className="h-8 text-xs"
                    type="text"
                    placeholder="File / report ref"
                    value={formData[k(section.id, ph, core)] ?? ''}
                    onChange={(e) => onChange(k(section.id, ph, core), e.target.value)}
                    disabled={isReadonly}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-1">
        Enter file name or report reference for each Phase × Core combination.
      </p>
    </div>
  );
}

function IrFixedSection({ section, formData, onChange, isReadonly }: Props & { section: Section }) {
  const predefinedRows = section.rows ?? [];
  const cols = section.columns ?? [];
  const rowLabelHeader = section.row_label_header ?? 'Insulation / Measurement';

  const getCellValue = (rowId: string, colKey: string) =>
    formData[k(section.id, rowId, colKey)] ?? '';

  const computePI = (rowId: string): string => {
    const v60 = parseFloat(getCellValue(rowId, 'val_60s'));
    const v600 = parseFloat(getCellValue(rowId, 'val_600s'));
    if (isNaN(v60) || isNaN(v600) || v60 === 0) return '';
    return (v600 / v60).toFixed(2);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border px-2 py-1 text-left w-8">Sr.</th>
            <th className="border px-2 py-1 text-left">{rowLabelHeader}</th>
            {cols.map((c) => (
              <th key={c.key} className="border px-2 py-1 text-center">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {predefinedRows.map((row, idx) => (
            <tr key={row.id} className="even:bg-muted/30">
              <td className="border px-2 py-1 text-center">{row.sr ?? idx + 1}</td>
              <td className="border px-2 py-1">{row.label ?? row.parameter ?? row.id}</td>
              {cols.map((c) => {
                const isPI = c.calculated && c.formula?.includes('val_600s');
                if (isPI) {
                  return (
                    <td key={c.key} className="border px-1 py-1">
                      <Input
                        className="h-8 text-xs bg-muted/40"
                        type="number"
                        value={computePI(row.id)}
                        readOnly
                        disabled
                        placeholder="auto"
                      />
                    </td>
                  );
                }
                return (
                  <td key={c.key} className="border px-1 py-1">
                    <FieldInput
                      fieldKey={k(section.id, row.id, c.key)}
                      def={c}
                      value={getCellValue(row.id, c.key)}
                      onChange={(v) => onChange(k(section.id, row.id, c.key), v)}
                      isReadonly={isReadonly}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IrFixedPhaseSection({ section, formData, onChange, isReadonly }: Props & { section: Section }) {
  const predefinedRows = section.rows ?? [];
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const rowLabelHeader = section.row_label_header ?? 'Insulation Tested';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th className="border px-2 py-1 text-center w-8">Sr.</th>
            <th className="border px-2 py-1 text-left">{rowLabelHeader}</th>
            <th className="border px-2 py-1 text-center w-20">Test Voltage</th>
            <th className="border px-2 py-1 text-center w-16">Unit</th>
            {phases.map((ph) => (
              <th key={ph} className="border px-2 py-1 text-center">
                Phase {ph}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {predefinedRows.map((row, idx) => (
            <tr key={row.id} className="even:bg-muted/30">
              <td className="border px-2 py-1 text-center">{row.sr ?? idx + 1}</td>
              <td className="border px-2 py-1">{row.insulation ?? row.label ?? row.id}</td>
              <td className="border px-2 py-1 text-center text-muted-foreground">{row.voltage ?? '—'}</td>
              <td className="border px-2 py-1 text-center text-muted-foreground">{row.unit ?? 'MΩ'}</td>
              {phases.map((ph) => (
                <td key={ph} className="border px-1 py-1">
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    value={formData[k(section.id, row.id, ph)] ?? ''}
                    onChange={(e) =>
                      onChange(
                        k(section.id, row.id, ph),
                        e.target.value === '' ? '' : parseFloat(e.target.value),
                      )
                    }
                    disabled={isReadonly}
                    placeholder="Value"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function TestFormV2({ taskId, sections, formData, onChange, isReadonly }: Props) {
  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const hasTitle = !!section.title;
        const body = renderSection(section, { taskId, sections, formData, onChange, isReadonly });
        if (!body) return null;

        return (
          <div key={section.id} className="space-y-2">
            {hasTitle && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {section.title}
              </p>
            )}
            {section.note && (
              <p className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded px-2 py-1">
                {section.note}
              </p>
            )}
            {body}
          </div>
        );
      })}
    </div>
  );
}

function renderSection(section: Section, props: Props): React.ReactNode {
  const common = { ...props, section };
  switch (section.type) {
    case 'fields':
      return <FieldsSection {...common} />;
    case 'phase_columns':
      return <PhaseColumnsSection {...common} />;
    case 'phase_rows':
      return <PhaseRowsSection {...common} />;
    case 'tap_table':
      return <TapTableSection {...common} />;
    case 'dynamic_table':
      return <DynamicTableSection {...common} />;
    case 'core_table':
      return <CoreTableSection {...common} />;
    case 'core_phase_table':
      return <CorePhaseTableSection {...common} />;
    case 'phase_core_upload':
      return <PhaseCoreUploadSection {...common} />;
    case 'ir_fixed':
      return <IrFixedSection {...common} />;
    case 'ir_fixed_phase':
      return <IrFixedPhaseSection {...common} />;
    default:
      return (
        <p className="text-xs text-muted-foreground">
          Unknown section type: {(section as any).type}
        </p>
      );
  }
}
