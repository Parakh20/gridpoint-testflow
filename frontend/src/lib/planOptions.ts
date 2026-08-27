import { formatInr } from '@/lib/format';

/**
 * A plan as offered in a picker (subscribe, upgrade, downgrade). Prices are
 * optional because `plans.monthly_price_inr` / `annual_price_inr` are NULL for
 * custom (Enterprise) plans, which are sales-assisted and have no self-serve
 * price to show.
 */
export type PlanOption = {
  slug: string;
  name: string;
  monthlyPriceInr?: number | null;
  annualPriceInr?: number | null;
};

export type BillingInterval = 'monthly' | 'annual';

export function planPrice(plan: PlanOption, interval: BillingInterval): number | null {
  const price = interval === 'monthly' ? plan.monthlyPriceInr : plan.annualPriceInr;
  return price ?? null;
}

/** "₹24,999/mo" — the price alone, or null when the plan has no listed price. */
export function formatPlanPrice(plan: PlanOption, interval: BillingInterval): string | null {
  const price = planPrice(plan, interval);
  if (price === null) return null;
  return `${formatInr(price)}/${interval === 'monthly' ? 'mo' : 'yr'}`;
}

/**
 * Label for a plan inside a <select>. Native <option> renders text only, so the
 * price has to live in the string rather than in separate markup.
 */
export function planOptionLabel(plan: PlanOption, interval: BillingInterval): string {
  const price = formatPlanPrice(plan, interval);
  return price ? `${plan.name} — ${price}` : `${plan.name} — contact sales`;
}

/**
 * How much a year on the annual price undercuts twelve months of the monthly
 * one, as a whole percent. Null unless both prices exist and annual is
 * genuinely cheaper — a zero or negative saving is not worth advertising.
 */
export function annualSavingPct(plan: PlanOption): number | null {
  const monthly = plan.monthlyPriceInr ?? null;
  const annual = plan.annualPriceInr ?? null;
  if (monthly === null || annual === null || monthly <= 0) return null;
  const saving = 1 - annual / (monthly * 12);
  if (saving <= 0) return null;
  return Math.round(saving * 100);
}
