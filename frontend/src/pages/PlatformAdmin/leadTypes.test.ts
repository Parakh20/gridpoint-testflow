import { describe, it, expect } from 'vitest';
import { employeeCountLabel } from './leadTypes';

describe('employeeCountLabel', () => {
  it('renders a band as a band rather than averaging it away', () => {
    expect(employeeCountLabel(50, 200)).toBe('50–200');
  });

  it('renders an open-ended lower bound with a plus', () => {
    expect(employeeCountLabel(400, null)).toBe('400+');
  });

  it('collapses a band whose ends are equal', () => {
    expect(employeeCountLabel(25, 25)).toBe('25');
  });

  it('handles a ceiling with no floor', () => {
    expect(employeeCountLabel(null, 30)).toBe('<30');
  });

  it('returns null when nothing is known, so callers can fall back', () => {
    expect(employeeCountLabel(null, null)).toBeNull();
  });

  it('does not treat a zero lower bound as missing', () => {
    expect(employeeCountLabel(0, 10)).toBe('0–10');
  });
});
