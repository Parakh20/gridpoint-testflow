import { describe, expect, test } from 'vitest';
import {
  annualSavingPct,
  formatPlanPrice,
  planOptionLabel,
  planPrice,
  type PlanOption,
} from '@/lib/planOptions';

const starter: PlanOption = {
  slug: 'starter',
  name: 'Starter',
  monthlyPriceInr: 24999,
  annualPriceInr: 249999,
};

const enterprise: PlanOption = {
  slug: 'enterprise',
  name: 'Enterprise',
  monthlyPriceInr: null,
  annualPriceInr: null,
};

describe('planPrice', () => {
  test('returns the price for the requested interval', () => {
    expect(planPrice(starter, 'monthly')).toBe(24999);
    expect(planPrice(starter, 'annual')).toBe(249999);
  });

  test('returns null for a custom plan with no listed price', () => {
    expect(planPrice(enterprise, 'monthly')).toBeNull();
  });

  test('treats an absent field the same as an explicit null', () => {
    expect(planPrice({ slug: 'x', name: 'X' }, 'monthly')).toBeNull();
  });
});

describe('formatPlanPrice', () => {
  test('formats monthly with a per-month suffix', () => {
    expect(formatPlanPrice(starter, 'monthly')).toBe('₹24,999/mo');
  });

  test('formats annual with a per-year suffix', () => {
    expect(formatPlanPrice(starter, 'annual')).toBe('₹2,49,999/yr');
  });

  test('returns null when there is no price to format', () => {
    expect(formatPlanPrice(enterprise, 'annual')).toBeNull();
  });
});

describe('planOptionLabel', () => {
  test('appends the price for the selected interval', () => {
    expect(planOptionLabel(starter, 'monthly')).toBe('Starter — ₹24,999/mo');
    expect(planOptionLabel(starter, 'annual')).toBe('Starter — ₹2,49,999/yr');
  });

  test('points a priceless plan at sales rather than showing a blank price', () => {
    expect(planOptionLabel(enterprise, 'monthly')).toBe('Enterprise — contact sales');
  });
});

describe('annualSavingPct', () => {
  test('reports the discount against twelve monthly payments', () => {
    // 12 x 24,999 = 2,99,988 vs 2,49,999 annual — about 17% off.
    expect(annualSavingPct(starter)).toBe(17);
  });

  test('returns null when annual is not actually cheaper', () => {
    expect(annualSavingPct({ slug: 'x', name: 'X', monthlyPriceInr: 100, annualPriceInr: 1200 })).toBeNull();
    expect(annualSavingPct({ slug: 'x', name: 'X', monthlyPriceInr: 100, annualPriceInr: 1500 })).toBeNull();
  });

  test('returns null when either price is missing', () => {
    expect(annualSavingPct(enterprise)).toBeNull();
    expect(annualSavingPct({ slug: 'x', name: 'X', monthlyPriceInr: 100 })).toBeNull();
  });

  test('returns null for a zero monthly price rather than dividing by zero', () => {
    expect(annualSavingPct({ slug: 'x', name: 'X', monthlyPriceInr: 0, annualPriceInr: 0 })).toBeNull();
  });
});
