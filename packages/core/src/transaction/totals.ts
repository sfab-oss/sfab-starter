import type { LineItem, TaxMode } from "@workspace/db/schema";
import { applyRate, type MoneyMinor } from "../money";

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
  // Signed lines (credit notes): keep the sign. Positive lines: floor at 0 so
  // an over-discount cannot invent a negative base.
  const raw = line.unitPrice * line.quantity - line.discount;
  const gross =
    line.unitPrice * line.quantity >= 0 ? Math.max(0, raw) : Math.min(0, raw);
  if (line.taxMode === "inclusive" && line.taxRate != null && gross !== 0) {
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
  if (base === 0) {
    return 0;
  }
  if (line.taxMode === "inclusive") {
    const raw = line.unitPrice * line.quantity - line.discount;
    const gross =
      line.unitPrice * line.quantity >= 0 ? Math.max(0, raw) : Math.min(0, raw);
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
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let taxableBase = 0;
  let exclusiveTaxTotal = 0;

  for (const l of lines) {
    subtotal += l.unitPrice * l.quantity;
    discountTotal += l.discount;
    taxableBase += computeLineTaxableBase(l);
    const tax = computeLineTax(l);
    taxTotal += tax;
    if (l.taxMode !== "inclusive") {
      exclusiveTaxTotal += tax;
    }
  }

  return {
    subtotal,
    discountTotal,
    taxTotal,
    total: subtotal - discountTotal + exclusiveTaxTotal,
    taxableBase,
  };
}
