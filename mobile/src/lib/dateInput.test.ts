import { describe, it, expect } from '@jest/globals';
import { maskDateInput, isValidDate, toDateInput } from './dateInput';

describe('maskDateInput', () => {
  it('inserts no hyphens for a partial year', () => {
    expect(maskDateInput('202')).toBe('202');
  });

  it('inserts a hyphen after the year once month digits start', () => {
    expect(maskDateInput('20260')).toBe('2026-0');
  });

  it('inserts both hyphens for a full date', () => {
    expect(maskDateInput('20260822')).toBe('2026-08-22');
  });

  it('strips non-digit characters and truncates past 8 digits', () => {
    expect(maskDateInput('2026-08-22-99')).toBe('2026-08-22');
  });
});

describe('isValidDate', () => {
  it('accepts a real calendar date in strict YYYY-MM-DD form', () => {
    expect(isValidDate('2026-08-22')).toBe(true);
  });

  it('rejects a malformed shape', () => {
    expect(isValidDate('2026-8-22')).toBe(false);
    expect(isValidDate('20260822')).toBe(false);
  });

  it('rejects a nonexistent date that still matches the digit shape (e.g. Feb 30)', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
  });

  it('rejects month/day out of range even before the Date round-trip check', () => {
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-01-32')).toBe(false);
  });
});

describe('toDateInput', () => {
  it('truncates a full timestamp to the date portion', () => {
    expect(toDateInput('2026-08-22T10:15:00Z')).toBe('2026-08-22');
  });

  it('returns an empty string for null/undefined', () => {
    expect(toDateInput(null)).toBe('');
    expect(toDateInput(undefined)).toBe('');
  });
});
