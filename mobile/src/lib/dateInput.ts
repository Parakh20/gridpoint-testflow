// Helpers for typing dates on mobile without a native picker.
// Users type digits only; hyphens are inserted automatically so the value
// always trends toward YYYY-MM-DD. Pairs with a numeric keyboard.

/** Mask raw input into a partial/complete YYYY-MM-DD string as the user types. */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8); // YYYYMMDD
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  let out = y;
  if (digits.length > 4) out += '-' + m;
  if (digits.length > 6) out += '-' + d;
  return out;
}

/** True only for a real calendar date in strict YYYY-MM-DD form. */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Normalize a stored date (DATE column or timestamp) to YYYY-MM-DD for editing. */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}
