import {
  computeLineTax,
  computeLineTaxableBase,
} from "@workspace/core/transaction/totals";
import { describe, expect, it } from "vitest";

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
