/**
 * Pure money math on integer minor units.
 *
 * The transaction hub stores every money value as integer minor units (the
 * smallest currency unit — cents, centavos). This module is the value helper:
 * arithmetic, basis-point rates/discounts, and largest-remainder allocation,
 * all on plain integers so floats never touch money (ADR-006).
 *
 * Runtime-pure: no `@workspace/db` import. The presentation twin (formatting +
 * major↔minor conversion for the UI) lives in `@workspace/ui/lib/money`; `ui`
 * cannot import `core`, so each carries its own copy of the ISO exponent map.
 *
 * @see docs/architecture/transaction-core.md §3 (Money and tax)
 */

/** Integer minor units — the smallest currency unit (e.g. centavos, cents). */
export type MoneyMinor = number;

/** ISO 4217 minor-unit exponents for currencies the starter handles. */
export const CURRENCY_MINOR_EXPONENT: Record<string, number> = {
  ARS: 2,
  BRL: 2,
  CAD: 2,
  CLP: 0,
  COP: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  MXN: 2,
  PEN: 2,
  USD: 2,
};

const DEFAULT_MINOR_EXPONENT = 2;

/** Basis points per one unit (100%). 1 bp = 0.01%. */
const BPS_PER_UNIT = 10_000;

export function getMinorExponent(currencyCode: string): number {
  return (
    CURRENCY_MINOR_EXPONENT[currencyCode.toUpperCase()] ??
    DEFAULT_MINOR_EXPONENT
  );
}

/** The minor-unit scale factor for a currency (10^exponent). */
export function minorFactor(currencyCode: string): number {
  return 10 ** getMinorExponent(currencyCode);
}

/** Add two minor-unit amounts. */
export function add(a: MoneyMinor, b: MoneyMinor): MoneyMinor {
  return a + b;
}

/** Subtract `b` from `a` (both minor units). */
export function subtract(a: MoneyMinor, b: MoneyMinor): MoneyMinor {
  return a - b;
}

/**
 * Exact sum of minor-unit amounts. Use for the header total: it is the exact Σ
 * of the (already line-rounded) line amounts — never re-round the header.
 */
export function sum(values: readonly MoneyMinor[]): MoneyMinor {
  let total = 0;
  for (const v of values) {
    total += v;
  }
  return total;
}

/** Round to the nearest minor unit (half away from zero). */
export function roundMinor(value: number): MoneyMinor {
  return Math.round(value);
}

/**
 * Apply a basis-point rate to a minor-unit amount, rounded to the nearest unit.
 * Use for tax (traslado) and any proportional charge: `applyRate(base, 1600)`
 * is 16% of `base`. Integer math — `(amount * bps) / BPS_PER_UNIT`, rounded once
 * per line; the header total is then the exact Σ of the rounded line taxes.
 */
export function applyRate(amount: MoneyMinor, bps: number): MoneyMinor {
  return Math.round((amount * bps) / BPS_PER_UNIT);
}

/** Apply a basis-point discount; returns the discounted minor-unit amount. */
export function applyDiscount(
  amount: MoneyMinor,
  discountBps: number
): MoneyMinor {
  return amount - applyRate(amount, discountBps);
}

/**
 * Distribute a minor-unit `amount` across `ratios` without losing or inventing a
 * unit (largest-remainder method). The returned parts sum exactly to `amount`.
 * Use for splitting a payment across documents, or allocating tax across
 * jurisdictions. A zero/empty ratio vector yields all-zero parts.
 */
export function allocate(
  amount: MoneyMinor,
  ratios: readonly number[]
): MoneyMinor[] {
  if (ratios.length === 0) {
    return [];
  }
  const totalRatio = sum(ratios);
  if (totalRatio <= 0) {
    return ratios.map(() => 0);
  }

  const raw = ratios.map((r) => (amount * r) / totalRatio);
  const floored = raw.map((r) => Math.floor(r));
  const remainder = amount - sum(floored);

  // Hand the leftover units to the largest fractional remainders, in order.
  const byRemainder = raw
    .map((r, i) => ({ i, rem: r - (floored[i] ?? 0) }))
    .sort((a, b) => b.rem - a.rem);
  for (let k = 0; k < remainder; k++) {
    const target = byRemainder[k % byRemainder.length];
    if (!target) {
      continue;
    }
    floored[target.i] = (floored[target.i] ?? 0) + 1;
  }
  return floored;
}
