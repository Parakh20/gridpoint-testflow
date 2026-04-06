import { format, parseISO, isValid } from 'date-fns';

/**
 * Formats an ISO date string to 'dd MMM yyyy' (e.g. 05 Apr 2026).
 * Returns 'Not set' for null/undefined, 'Invalid date' for bad input.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const date = parseISO(value);
  if (!isValid(date)) return 'Invalid date';
  return format(date, 'dd MMM yyyy');
}

/**
 * Formats an ISO datetime string to 'dd MMM yyyy, HH:mm'.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const date = parseISO(value);
  if (!isValid(date)) return 'Invalid date';
  return format(date, 'dd MMM yyyy, HH:mm');
}
