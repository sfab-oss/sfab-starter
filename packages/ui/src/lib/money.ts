/** Integer minor units — smallest currency unit (e.g. centavos, cents). */
export type MoneyMinor = number;

/** ISO 4217 minor-unit exponents for currencies the starter formats today. */
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

export function getMinorExponent(currencyCode: string): number {
  return (
    CURRENCY_MINOR_EXPONENT[currencyCode.toUpperCase()] ??
    DEFAULT_MINOR_EXPONENT
  );
}

export function minorToMajor(
  amountMinor: MoneyMinor,
  currencyCode: string
): number {
  const exponent = getMinorExponent(currencyCode);
  return amountMinor / 10 ** exponent;
}

export function majorToMinor(major: number, currencyCode: string): MoneyMinor {
  const exponent = getMinorExponent(currencyCode);
  return Math.round(major * 10 ** exponent);
}

/**
 * Display formatting for money — routes all currency rendering through one seam
 * (operator-ux §3). Uses locale + currency code; never hardcode USD.
 */
export function formatMoneyMinor(
  amountMinor: MoneyMinor,
  currencyCode: string,
  options?: { locale?: string }
): string {
  const locale = options?.locale ?? "es-MX";
  const major = minorToMajor(amountMinor, currencyCode);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(major);
}
