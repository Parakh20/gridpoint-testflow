import { describe, it, expect } from '@jest/globals';
import { coerceNumericFields, computeMissingRequiredFields } from './testFormValues';
import type { FieldSchema } from '@testflow/shared';
import type { V2Section } from '@/components/TestFormV2Native';

const numberField: FieldSchema = { name: 'reading', type: 'number', label: 'Reading', required: true };
const textField: FieldSchema = { name: 'notes_field', type: 'string', label: 'Notes' };

describe('coerceNumericFields', () => {
  it('leaves an already-numeric value untouched', () => {
    expect(coerceNumericFields([numberField], { reading: 12.5 })).toEqual({ reading: 12.5 });
  });

  it('coerces a clean numeric string to a number', () => {
    expect(coerceNumericFields([numberField], { reading: '12.5' })).toEqual({ reading: 12.5 });
  });

  it('coerces an in-progress trailing-dot string by stripping the dot first', () => {
    expect(coerceNumericFields([numberField], { reading: '12.' })).toEqual({ reading: 12 });
  });

  it('coerces a lone minus sign to 0 (pre-existing TestFormScreen behavior: "-".replace(/^-$/, "") ' +
    'yields "", and Number("") is 0, which is finite — this is a known quirk carried over unchanged ' +
    'from the original inline code, not something introduced by this extraction)', () => {
    expect(coerceNumericFields([numberField], { reading: '-' })).toEqual({ reading: 0 });
  });

  it('normalizes empty string / undefined / null to null', () => {
    expect(coerceNumericFields([numberField], { reading: '' })).toEqual({ reading: null });
    expect(coerceNumericFields([numberField], {})).toEqual({ reading: null });
  });

  it('leaves non-number-typed fields untouched, including their raw string value', () => {
    expect(coerceNumericFields([textField], { notes_field: 'hello' })).toEqual({ notes_field: 'hello' });
  });

  it('preserves keys not present in the field schema (e.g. stray/legacy data)', () => {
    expect(coerceNumericFields([numberField], { reading: 5, unrelated_key: 'x' })).toEqual({
      reading: 5,
      unrelated_key: 'x',
    });
  });
});

describe('computeMissingRequiredFields — legacy (V1) schema', () => {
  it('lists required fields with no value', () => {
    const fields: FieldSchema[] = [
      { name: 'a', required: true, label: 'A' },
      { name: 'b', required: false, label: 'B' },
    ];
    expect(computeMissingRequiredFields({ fields, v2Sections: null, values: {} })).toEqual(['a']);
  });

  it('treats empty string and null as missing, but not 0 or false', () => {
    const fields: FieldSchema[] = [
      { name: 'a', required: true, label: 'A' },
      { name: 'b', required: true, label: 'B' },
      { name: 'c', required: true, label: 'C' },
    ];
    const values = { a: 0, b: false, c: '' };
    expect(computeMissingRequiredFields({ fields, v2Sections: null, values })).toEqual(['c']);
  });
});

describe('computeMissingRequiredFields — V2 schema', () => {
  const v2Sections: V2Section[] = [
    {
      id: 'sec1',
      type: 'fields',
      fields: [{ key: 'x', label: 'X', required: true }, { key: 'y', label: 'Y', required: false }],
    } as unknown as V2Section,
    { id: 'sec2', type: 'phase_columns' } as unknown as V2Section, // non-'fields' section type — no required check
  ];

  it('lists missing required fields using the sectionId__fieldKey composite key', () => {
    expect(computeMissingRequiredFields({ fields: [], v2Sections, values: {} })).toEqual(['sec1__x']);
  });

  it('ignores required fields inside non-fields-type sections', () => {
    // sec2 is 'phase_columns', not 'fields' — no field-level required check happens for it.
    const values = { sec1__x: 'filled' };
    expect(computeMissingRequiredFields({ fields: [], v2Sections, values })).toEqual([]);
  });
});
