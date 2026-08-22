import { describe, it, expect } from 'vitest';
import { formatInr } from './format';

describe('formatInr', () => {
  it('formats a whole-rupee amount with the ₹ symbol and thousands separators', () => {
    expect(formatInr(50000)).toBe('₹50,000');
  });

  it('formats zero', () => {
    expect(formatInr(0)).toBe('₹0');
  });

  it('formats large amounts using Indian lakh/crore grouping', () => {
    expect(formatInr(1234567)).toBe('₹12,34,567');
  });
});
