/**
 * TestFormV2Native — React Native renderer for version-2 section-based test template schemas.
 *
 * Section types supported:
 *   fields           → labeled inputs grid
 *   phase_columns    → one card per field, R/Y/B inputs inside
 *   phase_rows       → one card per phase, column inputs inside
 *   tap_table        → one card per tap, Add Tap button
 *   dynamic_table    → one card per row, Add/Remove row buttons
 *   core_table       → one card per core, Add Core button
 *   core_phase_table → one card per core, per-phase inputs inside
 *   ir_fixed         → one card per predefined row, 60s/600s/auto-PI; add extra rows
 *   ir_fixed_phase   → one card per predefined row, per-phase value inputs
 *
 * Data key convention (identical to web TestFormV2 so records are cross-platform):
 *   fields           → {sectionId}__{fieldKey}
 *   phase_columns    → {sectionId}__{phase}__{fieldKey}
 *   phase_rows       → {sectionId}__{phase}__{colKey}
 *   tap_table        → {sectionId}__tap{n}__{colKey}
 *   dynamic_table    → {sectionId}__rows  (array of row objects)
 *   core_table       → {sectionId}__core{n}__{colKey}
 *   core_phase_table → {sectionId}__{coreIdx}__{phase}__{colKey}
 *   ir_fixed         → {sectionId}__{rowId}__{colKey}
 *   ir_fixed_phase   → {sectionId}__{rowId}__{phase}
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  title: string;
  type: 'string' | 'number' | 'enum' | 'date';
  enum?: string[];
  unit?: string;
  required?: boolean;
  calculated?: boolean;
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

export interface V2Section {
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
    | 'ir_fixed'
    | 'ir_fixed_phase'
    | 'phase_core_upload';
  fields?: FieldDef[];
  phases?: string[];
  columns?: ColDef[];
  cores?: string[];
  rows?: RowDef[];
  tap_count_default?: number;
  default_rows?: number;
  max_rows?: number;
  row_prompt?: string;
  num_cores_default?: number;
  row_label_header?: string;
}

export interface V2Schema {
  version: 2;
  sections: V2Section[];
}

interface Props {
  sections: V2Section[];
  formData: Record<string, any>;
  onChange: (key: string, value: any) => void;
  isReadonly: boolean;
}

// ─── Key builder (must match web exactly) ────────────────────────────────────

const k = (...parts: (string | number)[]) => parts.join('__');

// ─── Primitive field input ────────────────────────────────────────────────────

function FieldInput({
  def,
  value,
  onChange,
  isReadonly,
}: {
  def: FieldDef | ColDef;
  value: any;
  onChange: (v: any) => void;
  isReadonly: boolean;
}) {
  const isCalc = 'calculated' in def && def.calculated;

  if ('enum' in def && def.enum && def.enum.length > 0) {
    return (
      <View style={s.chipRow}>
        {def.enum.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              disabled={isReadonly || isCalc}
              style={[s.chip, active && s.chipActive]}
              onPress={() => {
                onChange(opt);
                void Haptics.selectionAsync();
              }}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  const isNum = def.type === 'number';
  return (
    <TextInput
      style={[s.input, (isReadonly || isCalc) && s.inputDisabled]}
      editable={!isReadonly && !isCalc}
      keyboardType={isNum ? 'decimal-pad' : 'default'}
      value={value === undefined || value === null ? '' : String(value)}
      onChangeText={(t) => {
        if (isNum) {
          let cleaned = t.replace(/[^0-9.\-]/g, '');
          cleaned = cleaned.replace(/(?!^)-/g, '');
          const firstDot = cleaned.indexOf('.');
          if (firstDot !== -1) {
            cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
          }
          if (cleaned === '' || cleaned === '-' || /[.\-]$/.test(cleaned)) {
            onChange(cleaned);
            return;
          }
          const num = Number(cleaned);
          onChange(Number.isFinite(num) ? num : cleaned);
        } else {
          onChange(t);
        }
      }}
      placeholder="—"
      placeholderTextColor={theme.textDim}
    />
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
      {note ? <Text style={s.sectionNote}>{note}</Text> : null}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.cardLabel}>{children}</Text>;
}

function FieldRow({
  label,
  unit,
  required,
  children,
}: {
  label: string;
  unit?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>
        {label}
        {unit ? <Text style={s.unit}> ({unit})</Text> : null}
        {required ? <Text style={{ color: theme.danger }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.addBtn} onPress={onPress}>
      <Text style={s.addBtnText}>+ {label}</Text>
    </TouchableOpacity>
  );
}

// ─── Section renderers ────────────────────────────────────────────────────────

function FieldsSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const fields = section.fields ?? [];
  if (fields.length === 0) return null;

  return (
    <View style={s.grid}>
      {fields.map((f) => (
        <View key={f.key} style={s.gridCell}>
          <FieldRow label={f.title} unit={f.unit} required={f.required}>
            <FieldInput
              def={f}
              value={formData[k(section.id, f.key)]}
              onChange={(v) => onChange(k(section.id, f.key), v)}
              isReadonly={isReadonly}
            />
          </FieldRow>
        </View>
      ))}
    </View>
  );
}

function PhaseColumnsSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const fields = section.fields ?? [];

  return (
    <View style={s.stack}>
      {fields.map((f) => (
        <Card key={f.key}>
          <CardLabel>
            {f.title}
            {f.unit ? ` (${f.unit})` : ''}
          </CardLabel>
          <View style={s.phaseRow}>
            {phases.map((ph) => (
              <View key={ph} style={s.phaseCell}>
                <Text style={s.phaseLabel}>{ph}</Text>
                <FieldInput
                  def={f}
                  value={formData[k(section.id, ph, f.key)]}
                  onChange={(v) => onChange(k(section.id, ph, f.key), v)}
                  isReadonly={isReadonly}
                />
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

function PhaseRowsSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const cols = section.columns ?? [];

  return (
    <View style={s.stack}>
      {phases.map((ph) => (
        <Card key={ph}>
          <CardLabel>Phase {ph}</CardLabel>
          {cols.map((c) => (
            <FieldRow key={c.key} label={c.title}>
              <FieldInput
                def={c}
                value={formData[k(section.id, ph, c.key)]}
                onChange={(v) => onChange(k(section.id, ph, c.key), v)}
                isReadonly={isReadonly}
              />
            </FieldRow>
          ))}
        </Card>
      ))}
    </View>
  );
}

function TapTableSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const defaultTapCount = section.tap_count_default ?? 17;
  const cols = section.columns ?? [];
  const extraCountKey = k(section.id, 'extra_tap_count');
  const extraCount: number = formData[extraCountKey] ?? 0;
  const totalTaps = defaultTapCount + extraCount;

  return (
    <View style={s.stack}>
      {Array.from({ length: totalTaps }, (_, i) => i + 1).map((n) => (
        <Card key={n}>
          <CardLabel>Tap {n}</CardLabel>
          {cols.map((c) => (
            <FieldRow key={c.key} label={c.title}>
              <FieldInput
                def={c}
                value={formData[k(section.id, `tap${n}`, c.key)]}
                onChange={(v) => onChange(k(section.id, `tap${n}`, c.key), v)}
                isReadonly={isReadonly}
              />
            </FieldRow>
          ))}
        </Card>
      ))}
      {!isReadonly && (
        <AddButton label="Add Tap" onPress={() => onChange(extraCountKey, extraCount + 1)} />
      )}
    </View>
  );
}

function DynamicTableSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const cols = section.columns ?? [];
  const rowsKey = k(section.id, 'rows');
  const storedRows: Record<string, any>[] = formData[rowsKey] ?? [];
  const defaultCount = section.default_rows ?? 1;
  const rows: Record<string, any>[] =
    storedRows.length > 0 ? storedRows : Array.from({ length: defaultCount }, () => ({}));

  const updateRow = (idx: number, colKey: string, value: any) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [colKey]: value } : r));
    onChange(rowsKey, next);
  };

  return (
    <View style={s.stack}>
      {section.row_prompt ? <Text style={s.rowPrompt}>{section.row_prompt}</Text> : null}
      {rows.map((row, idx) => (
        <Card key={idx}>
          <View style={s.cardTitleRow}>
            <CardLabel>Row {idx + 1}</CardLabel>
            {!isReadonly && rows.length > 1 && (
              <TouchableOpacity onPress={() => onChange(rowsKey, rows.filter((_, i) => i !== idx))}>
                <Text style={s.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          {cols.map((c) => (
            <FieldRow key={c.key} label={c.title}>
              <FieldInput
                def={c}
                value={row[c.key]}
                onChange={(v) => updateRow(idx, c.key, v)}
                isReadonly={isReadonly}
              />
            </FieldRow>
          ))}
        </Card>
      ))}
      {!isReadonly && !(section.max_rows && rows.length >= section.max_rows) && (
        <AddButton label="Add Row" onPress={() => onChange(rowsKey, [...rows, {}])} />
      )}
    </View>
  );
}

function CoreTableSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const cols = section.columns ?? [];
  const defaultCores = section.num_cores_default ?? 4;
  const extraCountKey = k(section.id, 'extra_core_count');
  const extraCount: number = formData[extraCountKey] ?? 0;
  const totalCores = defaultCores + extraCount;

  return (
    <View style={s.stack}>
      {Array.from({ length: totalCores }, (_, i) => i + 1).map((n) => (
        <Card key={n}>
          <CardLabel>Core {n}</CardLabel>
          {cols.map((c) => (
            <FieldRow key={c.key} label={c.title}>
              <FieldInput
                def={c}
                value={formData[k(section.id, `core${n}`, c.key)]}
                onChange={(v) => onChange(k(section.id, `core${n}`, c.key), v)}
                isReadonly={isReadonly}
              />
            </FieldRow>
          ))}
        </Card>
      ))}
      {!isReadonly && (
        <AddButton label="Add Core" onPress={() => onChange(extraCountKey, extraCount + 1)} />
      )}
    </View>
  );
}

function CorePhaseTableSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const cores = section.cores ?? ['1S1–1S2', '2S1–2S2', '3S1–3S2', '4S1–4S2'];
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const cols = section.columns ?? [];

  return (
    <View style={s.stack}>
      {cores.map((core, cIdx) => (
        <Card key={core}>
          <CardLabel>{core}</CardLabel>
          {phases.map((ph) => (
            <View key={ph} style={s.subGroup}>
              <Text style={s.subGroupLabel}>Phase {ph}</Text>
              {cols.map((c) => (
                <FieldRow key={c.key} label={c.title}>
                  <FieldInput
                    def={c}
                    value={formData[k(section.id, `${cIdx}`, ph, c.key)]}
                    onChange={(v) => onChange(k(section.id, `${cIdx}`, ph, c.key), v)}
                    isReadonly={isReadonly}
                  />
                </FieldRow>
              ))}
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}

function IrFixedSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const predefinedRows = section.rows ?? [];
  const cols = section.columns ?? [];
  const rowLabelHeader = section.row_label_header ?? 'Insulation / Measurement';
  const extraRowsKey = k(section.id, 'extra_rows');
  const extraRows: Array<{ id: string; label: string }> = formData[extraRowsKey] ?? [];

  const computePI = (rowId: string): string => {
    const v60 = parseFloat(formData[k(section.id, rowId, 'val_60s')] ?? '');
    const v600 = parseFloat(formData[k(section.id, rowId, 'val_600s')] ?? '');
    if (isNaN(v60) || isNaN(v600) || v60 === 0) return '';
    return (v600 / v60).toFixed(2);
  };

  return (
    <View style={s.stack}>
      {predefinedRows.map((row, idx) => (
        <Card key={row.id}>
          <CardLabel>
            {row.sr ?? idx + 1}. {row.label ?? row.parameter ?? row.id}
          </CardLabel>
          {cols.map((c) => {
            const isPI = c.calculated && c.formula?.includes('val_600s');
            return (
              <FieldRow key={c.key} label={c.title}>
                {isPI ? (
                  <TextInput
                    style={[s.input, s.inputDisabled]}
                    editable={false}
                    value={computePI(row.id)}
                    placeholder="auto"
                    placeholderTextColor={theme.textDim}
                  />
                ) : (
                  <FieldInput
                    def={c}
                    value={formData[k(section.id, row.id, c.key)]}
                    onChange={(v) => onChange(k(section.id, row.id, c.key), v)}
                    isReadonly={isReadonly}
                  />
                )}
              </FieldRow>
            );
          })}
        </Card>
      ))}

      {extraRows.map((row, idx) => (
        <Card key={row.id}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardLabel}>
              {predefinedRows.length + idx + 1}. Extra row
            </Text>
            {!isReadonly && (
              <TouchableOpacity
                onPress={() => onChange(extraRowsKey, extraRows.filter((_, i) => i !== idx))}
              >
                <Text style={s.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <FieldRow label={rowLabelHeader}>
            <TextInput
              style={[s.input, isReadonly && s.inputDisabled]}
              editable={!isReadonly}
              value={row.label}
              onChangeText={(t) =>
                onChange(extraRowsKey, extraRows.map((r, i) => (i === idx ? { ...r, label: t } : r)))
              }
              placeholder="Description…"
              placeholderTextColor={theme.textDim}
            />
          </FieldRow>
          {cols.filter((c) => !(c.calculated && c.formula?.includes('val_600s'))).map((c) => (
            <FieldRow key={c.key} label={c.title}>
              <FieldInput
                def={c}
                value={formData[k(section.id, row.id, c.key)]}
                onChange={(v) => onChange(k(section.id, row.id, c.key), v)}
                isReadonly={isReadonly}
              />
            </FieldRow>
          ))}
        </Card>
      ))}

      {!isReadonly && (
        <AddButton
          label="Add Row"
          onPress={() =>
            onChange(extraRowsKey, [...extraRows, { id: `extra_${Date.now()}`, label: '' }])
          }
        />
      )}
    </View>
  );
}

function IrFixedPhaseSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const predefinedRows = section.rows ?? [];
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const rowLabelHeader = section.row_label_header ?? 'Insulation Tested';
  const extraRowsKey = k(section.id, 'extra_rows');
  const extraRows: Array<{ id: string; insulation: string; voltage: string; unit: string }> =
    formData[extraRowsKey] ?? [];

  return (
    <View style={s.stack}>
      {predefinedRows.map((row, idx) => (
        <Card key={row.id}>
          <CardLabel>
            {row.sr ?? idx + 1}. {row.insulation ?? row.label ?? row.id}
            {row.voltage ? ` @ ${row.voltage}` : ''}
            {row.unit ? ` (${row.unit})` : ''}
          </CardLabel>
          <View style={s.phaseRow}>
            {phases.map((ph) => (
              <View key={ph} style={s.phaseCell}>
                <Text style={s.phaseLabel}>{ph}</Text>
                <TextInput
                  style={[s.input, isReadonly && s.inputDisabled]}
                  editable={!isReadonly}
                  keyboardType="decimal-pad"
                  value={formData[k(section.id, row.id, ph)] !== undefined
                    ? String(formData[k(section.id, row.id, ph)])
                    : ''}
                  onChangeText={(t) => {
                    const num = parseFloat(t);
                    onChange(k(section.id, row.id, ph), t === '' ? '' : Number.isFinite(num) ? num : t);
                  }}
                  placeholder="—"
                  placeholderTextColor={theme.textDim}
                />
              </View>
            ))}
          </View>
        </Card>
      ))}

      {extraRows.map((row, idx) => (
        <Card key={row.id}>
          <View style={s.cardTitleRow}>
            <CardLabel>{predefinedRows.length + idx + 1}. Extra row</CardLabel>
            {!isReadonly && (
              <TouchableOpacity
                onPress={() => onChange(extraRowsKey, extraRows.filter((_, i) => i !== idx))}
              >
                <Text style={s.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <FieldRow label={rowLabelHeader}>
            <TextInput
              style={[s.input, isReadonly && s.inputDisabled]}
              editable={!isReadonly}
              value={row.insulation}
              onChangeText={(t) =>
                onChange(extraRowsKey, extraRows.map((r, i) => (i === idx ? { ...r, insulation: t } : r)))
              }
              placeholder="Insulation tested…"
              placeholderTextColor={theme.textDim}
            />
          </FieldRow>
          <View style={s.phaseRow}>
            {phases.map((ph) => (
              <View key={ph} style={s.phaseCell}>
                <Text style={s.phaseLabel}>{ph}</Text>
                <TextInput
                  style={[s.input, isReadonly && s.inputDisabled]}
                  editable={!isReadonly}
                  keyboardType="decimal-pad"
                  value={formData[k(section.id, row.id, ph)] !== undefined
                    ? String(formData[k(section.id, row.id, ph)])
                    : ''}
                  onChangeText={(t) => {
                    const num = parseFloat(t);
                    onChange(k(section.id, row.id, ph), t === '' ? '' : Number.isFinite(num) ? num : t);
                  }}
                  placeholder="—"
                  placeholderTextColor={theme.textDim}
                />
              </View>
            ))}
          </View>
        </Card>
      ))}

      {!isReadonly && (
        <AddButton
          label="Add Row"
          onPress={() =>
            onChange(extraRowsKey, [
              ...extraRows,
              { id: `extra_${Date.now()}`, insulation: '', voltage: '', unit: 'MΩ' },
            ])
          }
        />
      )}
    </View>
  );
}

function PhaseCoreUploadSection({
  section,
  formData,
  onChange,
  isReadonly,
}: Props & { section: V2Section }) {
  const phases = section.phases ?? ['R', 'Y', 'B'];
  const cores = section.cores ?? ['Core 1', 'Core 2', 'Core 3', 'Core 4'];

  return (
    <View style={s.stack}>
      {phases.map((ph) => (
        <Card key={ph}>
          <CardLabel>Phase {ph}</CardLabel>
          {cores.map((core) => (
            <FieldRow key={core} label={core}>
              <TextInput
                style={[s.input, isReadonly && s.inputDisabled]}
                editable={!isReadonly}
                value={formData[k(section.id, ph, core)] ?? ''}
                onChangeText={(t) => onChange(k(section.id, ph, core), t)}
                placeholder="File / report ref"
                placeholderTextColor={theme.textDim}
              />
            </FieldRow>
          ))}
        </Card>
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TestFormV2Native({ sections, formData, onChange, isReadonly }: Props) {
  return (
    <View style={s.root}>
      {sections.map((section) => {
        const body = renderSection(section, { sections, formData, onChange, isReadonly });
        if (!body) return null;
        return (
          <View key={section.id} style={s.section}>
            {section.title ? <SectionHeader title={section.title} note={section.note} /> : null}
            {body}
          </View>
        );
      })}
    </View>
  );
}

function renderSection(section: V2Section, props: Props): React.ReactNode {
  const p = { ...props, section };
  switch (section.type) {
    case 'fields':           return <FieldsSection {...p} />;
    case 'phase_columns':    return <PhaseColumnsSection {...p} />;
    case 'phase_rows':       return <PhaseRowsSection {...p} />;
    case 'tap_table':        return <TapTableSection {...p} />;
    case 'dynamic_table':    return <DynamicTableSection {...p} />;
    case 'core_table':       return <CoreTableSection {...p} />;
    case 'core_phase_table': return <CorePhaseTableSection {...p} />;
    case 'ir_fixed':         return <IrFixedSection {...p} />;
    case 'ir_fixed_phase':   return <IrFixedPhaseSection {...p} />;
    case 'phase_core_upload': return <PhaseCoreUploadSection {...p} />;
    default:
      return (
        <Text style={s.unknown}>
          Unknown section type: {(section as any).type}
        </Text>
      );
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { gap: 20 },
  section: { gap: 8 },
  sectionHeader: { gap: 4 },
  sectionTitle: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionNote: {
    color: theme.accent,
    fontSize: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    lineHeight: 17,
  },
  stack: { gap: 8 },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 12,
    gap: 10,
  },
  cardLabel: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 13,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldRow: { gap: 4 },
  fieldLabel: { color: theme.textDim, fontSize: 12 },
  unit: { color: theme.textDim, fontSize: 11 },
  input: {
    backgroundColor: theme.muted,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  inputDisabled: { opacity: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.card,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.text, fontSize: 13 },
  chipTextActive: { color: theme.primaryText, fontWeight: '700' },
  phaseRow: { flexDirection: 'row', gap: 8 },
  phaseCell: { flex: 1, gap: 4 },
  phaseLabel: { color: theme.textDim, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  subGroup: { gap: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: theme.border },
  subGroupLabel: { color: theme.textDim, fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell: { width: '47%' },
  rowPrompt: { color: theme.textDim, fontSize: 12, fontStyle: 'italic' },
  removeText: { color: theme.danger, fontSize: 12 },
  addBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: theme.card,
  },
  addBtnText: { color: theme.primary, fontWeight: '600', fontSize: 13 },
  unknown: { color: theme.textDim, fontSize: 12, fontStyle: 'italic' },
});
