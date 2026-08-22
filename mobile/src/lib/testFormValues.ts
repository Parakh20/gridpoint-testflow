import type { FieldSchema } from '@testflow/shared';
import type { V2Section } from '@/components/TestFormV2Native';

/**
 * Pure value-coercion + validation logic extracted from TestFormScreen.tsx.
 * Load-bearing: coerceNumericFields runs on every autosave/submit before the
 * test_records upsert; computeMissingRequiredFields gates whether Submit is
 * allowed at all. Both were previously inline in TestFormScreen with zero
 * test coverage.
 */

/**
 * Coerces in-progress numeric-field strings ("12.", "-") to clean numbers or
 * null before persisting. Non-number-typed fields and keys absent from the
 * schema pass through untouched.
 */
export function coerceNumericFields(
  fields: FieldSchema[],
  values: Record<string, any>
): Record<string, any> {
  const normalized: Record<string, any> = { ...values };
  for (const f of fields) {
    if (!f.name || f.type !== 'number') continue;
    const v = normalized[f.name];
    if (v === undefined || v === null || v === '') {
      normalized[f.name] = null;
      continue;
    }
    if (typeof v === 'number') continue;
    const trimmed = String(v).replace(/\.$/, '').replace(/^-$/, '');
    const num = Number(trimmed);
    normalized[f.name] = Number.isFinite(num) ? num : null;
  }
  return normalized;
}

type MissingFieldsArgs = {
  fields: FieldSchema[];
  v2Sections: V2Section[] | null;
  values: Record<string, any>;
};

/**
 * Returns the list of missing required field keys, branching on V2
 * section-based schema vs. legacy flat `fields[]`. V2 keys are composite
 * `${sectionId}__${fieldKey}`, matching TestFormV2Native's onChange key shape.
 */
export function computeMissingRequiredFields({ fields, v2Sections, values }: MissingFieldsArgs): string[] {
  if (v2Sections !== null) {
    const required: string[] = [];
    for (const sec of v2Sections) {
      if (sec.type === 'fields') {
        for (const f of (sec as any).fields ?? []) {
          if (f.required) required.push(`${sec.id}__${f.key}`);
        }
      }
    }
    return required.filter((k) => values[k] === undefined || values[k] === '' || values[k] === null);
  }
  return fields
    .filter((f) => f.required && f.name)
    .map((f) => f.name!)
    .filter((n) => values[n] === undefined || values[n] === '' || values[n] === null);
}
