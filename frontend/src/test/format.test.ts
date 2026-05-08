import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from '@/lib/format';

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    expect(formatDate('2026-04-09')).toBe('09 Apr 2026');
  });

  it('formats a datetime string (ignores time portion)', () => {
    expect(formatDate('2026-04-09T10:30:00Z')).toBe('09 Apr 2026');
  });

  it('returns "Not set" for null', () => {
    expect(formatDate(null)).toBe('Not set');
  });

  it('returns "Not set" for undefined', () => {
    expect(formatDate(undefined)).toBe('Not set');
  });

  it('returns "Invalid date" for a non-date string', () => {
    expect(formatDate('not-a-date')).toBe('Invalid date');
  });
});

describe('formatDateTime', () => {
  it('formats a valid ISO datetime string', () => {
    // Use a fixed UTC timestamp; date-fns parses in local time — check format only
    const result = formatDateTime('2026-04-09T14:30:00Z');
    expect(result).toMatch(/09 Apr 2026, \d{2}:\d{2}/);
  });

  it('returns "Not set" for null', () => {
    expect(formatDateTime(null)).toBe('Not set');
  });
});
