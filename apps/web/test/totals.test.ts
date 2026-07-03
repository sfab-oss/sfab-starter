import {
  computeDocumentTotals,
  computeLineTax,
  computeLineTaxableBase,
} from "@workspace/core/transaction/totals";
import type { LineItem } from "@workspace/db/schema";
import { describe, expect, it } from "vitest";

function mockLine(overrides: Partial<LineItem>): LineItem {
  return {
    id: "test",
    organizationId: "org",
    documentId: "doc",
    productId: null,
    description: "",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    taxRate: 0,
    taxCode: null,
    taxMode: "exclusive",
    taxAmount: 0,
    taxableBase: 0,
    fulfillmentMode: "none",
    warehouseId: null,
    metadata: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeLineTaxableBase", () => {
  it("is gross minus discount", () => {
    expect(
      computeLineTaxableBase({ unitPrice: 500, quantity: 2, discount: 100 })
    ).toBe(900);
  });

  it("floors at zero when discount exceeds gross", () => {
    expect(
      computeLineTaxableBase({ unitPrice: 100, quantity: 1, discount: 200 })
    ).toBe(0);
  });

  it("returns the net for inclusive lines", () => {
    // 1160 incl. 16% → net = round(1160 / 1.16) = 1000
    expect(
      computeLineTaxableBase({
        unitPrice: 1160,
        quantity: 1,
        discount: 0,
        taxMode: "inclusive",
        taxRate: 1600,
      })
    ).toBe(1000);
  });

  it("returns the gross for exclusive lines (taxMode does not change it)", () => {
    expect(
      computeLineTaxableBase({
        unitPrice: 1000,
        quantity: 1,
        discount: 0,
        taxMode: "exclusive",
        taxRate: 1600,
      })
    ).toBe(1000);
  });
});

describe("computeLineTax — exclusive (default)", () => {
  it("applies the rate to the taxable base", () => {
    // 1000 base, 16% = 1600 bps → 160 tax
    expect(
      computeLineTax({
        unitPrice: 1000,
        quantity: 1,
        discount: 0,
        taxRate: 1600,
        taxMode: "exclusive",
      })
    ).toBe(160);
  });

  it("returns zero on a zero base", () => {
    expect(
      computeLineTax({
        unitPrice: 0,
        quantity: 1,
        discount: 0,
        taxRate: 1600,
        taxMode: "exclusive",
      })
    ).toBe(0);
  });
});

describe("computeLineTax — inclusive", () => {
  it("extracts tax already embedded in the price", () => {
    // Price 1160 incl. 16% tax → net = round(1160 / 1.16) = 1000, tax = 160
    expect(
      computeLineTax({
        unitPrice: 1160,
        quantity: 1,
        discount: 0,
        taxRate: 1600,
        taxMode: "inclusive",
      })
    ).toBe(160);
  });

  it("handles inclusive with quantity > 1", () => {
    // 2 × 1160 = 2320 incl. 16% → net = round(2320 / 1.16) = 2000, tax = 320
    expect(
      computeLineTax({
        unitPrice: 1160,
        quantity: 2,
        discount: 0,
        taxRate: 1600,
        taxMode: "inclusive",
      })
    ).toBe(320);
  });

  it("handles inclusive after discount", () => {
    // 2 × 1160 - 160 = 2160 incl. 16% → net = round(2160 / 1.16) = 1862, tax = 298
    expect(
      computeLineTax({
        unitPrice: 1160,
        quantity: 2,
        discount: 160,
        taxRate: 1600,
        taxMode: "inclusive",
      })
    ).toBe(298);
  });
});

describe("computeDocumentTotals — exclusive lines", () => {
  it("adds tax on top of subtotal", () => {
    const totals = computeDocumentTotals([
      mockLine({
        unitPrice: 1000,
        quantity: 2,
        taxRate: 1600,
        taxMode: "exclusive",
      }),
    ]);
    // subtotal = 2000, discount = 0, tax = 320 → total = 2320
    expect(totals.subtotal).toBe(2000);
    expect(totals.taxTotal).toBe(320);
    expect(totals.total).toBe(2320);
    expect(totals.taxableBase).toBe(2000);
  });
});

describe("computeDocumentTotals — inclusive lines (the bug)", () => {
  it("does NOT double-count inclusive tax in the total", () => {
    const totals = computeDocumentTotals([
      mockLine({
        unitPrice: 1160,
        quantity: 1,
        taxRate: 1600,
        taxMode: "inclusive",
      }),
    ]);
    // subtotal = 1160 (includes tax), tax = 160 (extracted), but total must be
    // 1160 — the customer owes 1160, not 1320.
    expect(totals.subtotal).toBe(1160);
    expect(totals.taxTotal).toBe(160);
    expect(totals.total).toBe(1160);
    // taxableBase is the net (1000), not the gross
    expect(totals.taxableBase).toBe(1000);
  });

  it("handles multiple inclusive lines", () => {
    const totals = computeDocumentTotals([
      mockLine({
        unitPrice: 1160,
        quantity: 1,
        taxRate: 1600,
        taxMode: "inclusive",
      }),
      mockLine({
        unitPrice: 1160,
        quantity: 1,
        taxRate: 1600,
        taxMode: "inclusive",
      }),
    ]);
    // 2 × 1160 = 2320 subtotal (includes 320 tax), total = 2320
    expect(totals.subtotal).toBe(2320);
    expect(totals.taxTotal).toBe(320);
    expect(totals.total).toBe(2320);
    expect(totals.taxableBase).toBe(2000);
  });

  it("handles inclusive with discount", () => {
    const totals = computeDocumentTotals([
      mockLine({
        unitPrice: 1160,
        quantity: 2,
        discount: 160,
        taxRate: 1600,
        taxMode: "inclusive",
      }),
    ]);
    // gross = 2320 - 160 = 2160, net = round(2160/1.16) = 1862, tax = 298
    // total = subtotal - discount = 2320 - 160 = 2160 (tax already in subtotal)
    expect(totals.subtotal).toBe(2320);
    expect(totals.discountTotal).toBe(160);
    expect(totals.taxTotal).toBe(298);
    expect(totals.total).toBe(2160);
    expect(totals.taxableBase).toBe(1862);
  });
});

describe("computeDocumentTotals — mixed tax modes", () => {
  it("separates exclusive-add from inclusive-baked", () => {
    const totals = computeDocumentTotals([
      mockLine({
        unitPrice: 1000,
        quantity: 1,
        taxRate: 1600,
        taxMode: "exclusive",
      }),
      mockLine({
        unitPrice: 1160,
        quantity: 1,
        taxRate: 1600,
        taxMode: "inclusive",
      }),
    ]);
    // Exclusive line: subtotal 1000, tax 160, contributes 1160 to total.
    // Inclusive line: subtotal 1160 (includes 160 tax), contributes 1160 to total.
    // Total = 2320. taxTotal = 320 (both lines' tax, for reporting).
    expect(totals.subtotal).toBe(2160);
    expect(totals.taxTotal).toBe(320);
    expect(totals.total).toBe(2320);
    expect(totals.taxableBase).toBe(2000); // 1000 + 1000
  });
});
