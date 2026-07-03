import {
  allocate,
  applyRate,
  getMinorExponent,
  minorFactor,
  sum,
} from "@workspace/core/money";
import { describe, expect, it } from "vitest";

// No-DB unit tests for the pure core/money helper (ADR-006 §3). Runs in the
// workers pool but touches no D1 binding — `@workspace/core/money` is runtime-pure.

describe("core/money — exponents", () => {
  it("resolves ISO 4217 minor exponents", () => {
    expect(getMinorExponent("USD")).toBe(2);
    expect(getMinorExponent("MXN")).toBe(2);
    expect(getMinorExponent("CLP")).toBe(0);
    expect(getMinorExponent("JPY")).toBe(0);
  });

  it("falls back to 2 for unknown currencies (case-insensitive)", () => {
    expect(getMinorExponent("XXX")).toBe(2);
    expect(getMinorExponent("usd")).toBe(2);
  });

  it("derives the minor factor (10^exponent)", () => {
    expect(minorFactor("USD")).toBe(100);
    expect(minorFactor("JPY")).toBe(1);
  });
});

describe("core/money — sum", () => {
  it("sums exactly (header = exact Σ of line-rounded lines)", () => {
    expect(sum([100, 100, 100])).toBe(300);
    expect(sum([])).toBe(0);
  });
});

describe("core/money — basis-point rates", () => {
  it("applies a rate in basis points (16% = 1600 bps)", () => {
    expect(applyRate(10_000, 1600)).toBe(1600);
    // rounds to the nearest minor unit: 9999 * 0.16 = 1599.84 -> 1600
    expect(applyRate(9999, 1600)).toBe(1600);
  });

  it("treats a zero rate as zero", () => {
    expect(applyRate(10_000, 0)).toBe(0);
  });
});

describe("core/money — allocate (largest remainder)", () => {
  it("distributes without losing or inventing a unit", () => {
    // 100 across [1,1,1] -> [34,33,33] (sums to 100)
    const parts = allocate(100, [1, 1, 1]);
    expect(sum(parts)).toBe(100);
    expect(parts).toEqual([34, 33, 33]);
  });

  it("handles a unit-loss case (10 cents across thirds)", () => {
    const parts = allocate(10, [1, 1, 1]);
    expect(sum(parts)).toBe(10);
    expect(parts).toEqual([4, 3, 3]);
  });

  it("returns all-zero for an empty / zero ratio vector", () => {
    expect(allocate(100, [])).toEqual([]);
    expect(allocate(100, [0, 0])).toEqual([0, 0]);
  });

  it("allocates by proportional weights", () => {
    // 1000 across [3,2,1] -> [500,333,167] sums to 1000
    const parts = allocate(1000, [3, 2, 1]);
    expect(sum(parts)).toBe(1000);
    expect(parts[0]).toBeGreaterThan(parts[1]);
    expect(parts[1]).toBeGreaterThan(parts[2]);
  });
});
