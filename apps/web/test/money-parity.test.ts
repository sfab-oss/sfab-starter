import { CURRENCY_MINOR_EXPONENT as CORE_MAP } from "@workspace/core/money";
import { CURRENCY_MINOR_EXPONENT as UI_MAP } from "@workspace/ui/lib/money";
import { describe, expect, it } from "vitest";

describe("CURRENCY_MINOR_EXPONENT parity (core ↔ ui)", () => {
  it("core and ui carry the same exponent map", () => {
    expect(CORE_MAP).toEqual(UI_MAP);
  });

  it("both agree on zero-exponent currencies", () => {
    expect(CORE_MAP.CLP).toBe(0);
    expect(UI_MAP.CLP).toBe(0);
    expect(CORE_MAP.JPY).toBe(0);
    expect(UI_MAP.JPY).toBe(0);
  });
});
