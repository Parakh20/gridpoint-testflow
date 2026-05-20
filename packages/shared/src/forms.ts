/**
 * `test_templates.fields` can be either a legacy array of field descriptors
 * OR a JSON-Schema-style object. Normalize to the array form for rendering.
 */

export type FieldSchema = {
  name?: string;
  label?: string;
  type?: 'string' | 'number' | 'boolean';
  enum?: string[];
  unit?: string;
  required?: boolean;
};

export function normalizeFields(raw: unknown): FieldSchema[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as FieldSchema[];

  const obj = raw as { type?: string; properties?: Record<string, any>; required?: string[] };
  if (obj.type === 'object' && obj.properties) {
    const required: string[] = obj.required ?? [];
    return Object.entries(obj.properties).map(([k, v]) => ({
      name: k,
      label: v.label ?? k,
      type: v.type ?? 'string',
      enum: v.enum,
      unit: v.unit,
      required: required.includes(k),
    }));
  }
  return [];
}
