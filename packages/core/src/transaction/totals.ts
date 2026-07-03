import type { LineItem, TaxMode } from "@workspace/db/schema";
import { applyRate, type MoneyMinor, sum } from "../money";

/**
 * Document totals, computed by rounding per line and taking the exact Σ for the
 * header (ADR-006 §3). `taxTotal` excludes withholdings — the base carries one
 * generic traslado per line; retenciones are a pack (line_tax_components).
 */
export interface DocumentTotals {
  subtotal: MoneyMinor; // Σ (unitPrice * quantity), before line discounts
  discountTotal: MoneyMinor; // Σ line discount
  taxTotal: MoneyMinor; // Σ line-rounded tax (excludes withholdings)
  total: MoneyMinor; // subtotal - discountTotal + taxTotal
  taxableBase: MoneyMinor; // Σ (line taxable base)
}

/** Per-line taxable base: gross minus discount, floored at 0. */
export function computeLineTaxableBase(line: {
  unitPrice: number;
  quantity: number;
  discount: number;
}): MoneyMinor {
  return Math.max(0, line.unitPrice * line.quantity - line.discount);
}

/** Per-line tax, rounded once. Exclusive (default) or inclusive of the price. */
export function computeLineTax(line: {
  unitPrice: number;
  quantity: number;
  discount: number;
  taxRate: number;
  taxMode: TaxMode;
}): MoneyMinor {
  const base = computeLineTaxableBase(line);
  if (base <= 0) {
    return 0;
  }
  if (line.taxMode === "inclusive") {
    // unitPrice already includes tax: tax = base - base/(1 + rate)
    const net = Math.round(base / (1 + line.taxRate / 10_000));
    return base - net;
  }
  return applyRate(base, line.taxRate); // exclusive
}

/**
 * Compute header totals from line items. Round per line; the header is the exact
 * Σ of the line-rounded values (never re-round the header).
 */
export function computeDocumentTotals(lines: LineItem[]): DocumentTotals {
  const grossPerLine = lines.map((l) => l.unitPrice * l.quantity);
  const subtotal = sum(grossPerLine);
  const discountTotal = sum(lines.map((l) => l.discount));
  const taxPerLine = lines.map(computeLineTax);
  const taxTotal = sum(taxPerLine);
  const taxableBase = sum(lines.map(computeLineTaxableBase));
  const total = subtotal - discountTotal + taxTotal;
  return { subtotal, discountTotal, taxTotal, total, taxableBase };
}
