import type { LineItem, TaxMode } from "@workspace/db/schema";
import { applyRate, type MoneyMinor, sum } from "../money";

/**
 * Document totals, computed by rounding per line and taking the exact Σ for the
 * header (ADR-006 §3). `taxTotal` excludes withholdings — the base carries one
 * generic traslado per line; retenciones are a pack (line_tax_components).
 *
 * Inclusive vs exclusive: for an **exclusive** line, `unitPrice` is the net and
 * tax is added on top; for an **inclusive** line, `unitPrice` already includes
 * the tax. `total` only adds tax from exclusive lines — inclusive-line tax is
 * already baked into `subtotal`.
 */
export interface DocumentTotals {
  subtotal: MoneyMinor; // Σ (unitPrice * quantity), before line discounts
  discountTotal: MoneyMinor; // Σ line discount
  taxTotal: MoneyMinor; // Σ line-rounded tax (excludes withholdings)
  total: MoneyMinor; // subtotal - discountTotal + exclusive-line tax
  taxableBase: MoneyMinor; // Σ (line taxable base: net for inclusive, gross for exclusive)
}

/**
 * Per-line taxable base: gross minus discount, then net-extracted for inclusive.
 *
 * For **exclusive** lines (and lines with no tax): returns the gross (unitPrice
 * × qty − discount). For **inclusive** lines: returns the net, i.e. gross with
 * the tax extracted (`gross / (1 + rate)`), floored at 0.
 */
export function computeLineTaxableBase(line: {
  unitPrice: number;
  quantity: number;
  discount: number;
  taxMode?: TaxMode | null;
  taxRate?: number | null;
}): MoneyMinor {
  const gross = Math.max(0, line.unitPrice * line.quantity - line.discount);
  if (line.taxMode === "inclusive" && line.taxRate != null && gross > 0) {
    return Math.round(gross / (1 + line.taxRate / 10_000));
  }
  return gross;
}

/**
 * Per-line tax, rounded once. Exclusive (default) or inclusive of the price.
 *
 * For **exclusive**: `applyRate(base, rate)` on the gross. For **inclusive**: the
 * tax already embedded in the price, i.e. `gross − net` where net is the
 * taxable base computed above.
 */
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
    const gross = Math.max(0, line.unitPrice * line.quantity - line.discount);
    return gross - base;
  }
  return applyRate(base, line.taxRate);
}

/**
 * Compute header totals from line items. Round per line; the header is the exact
 * Σ of the line-rounded values (never re-round the header).
 *
 * For **inclusive** lines the tax is already in `unitPrice` (hence in subtotal),
 * so it is NOT added again — only **exclusive**-line tax is added on top.
 */
export function computeDocumentTotals(lines: LineItem[]): DocumentTotals {
  const grossPerLine = lines.map((l) => l.unitPrice * l.quantity);
  const subtotal = sum(grossPerLine);
  const discountTotal = sum(lines.map((l) => l.discount));
  const taxPerLine = lines.map(computeLineTax);
  const taxTotal = sum(taxPerLine);
  const taxableBase = sum(lines.map(computeLineTaxableBase));

  // Only exclusive-line tax is added on top of subtotal. Inclusive-line tax is
  // already baked into unitPrice, so adding it again would double-count.
  const exclusiveTaxTotal = sum(
    lines.map((l, i) => (l.taxMode === "inclusive" ? 0 : (taxPerLine[i] ?? 0)))
  );
  const total = subtotal - discountTotal + exclusiveTaxTotal;

  return { subtotal, discountTotal, taxTotal, total, taxableBase };
}
