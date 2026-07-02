import { env } from "cloudflare:test";
import { documentFamily } from "@workspace/core/transaction";
import { DOCUMENT_FAMILY, DOCUMENT_TYPES } from "@workspace/db/schema";
import { describe, expect, it } from "vitest";

// AC-8 (C9): `family` is a persisted column with a DB CHECK linked to `type`,
// and `core.documentFamily()` is the single resolver with no default branch.
// Both derive from DOCUMENT_FAMILY; this asserts they agree and the CHECK
// covers every type (so agent/SQL can't silently mis-family a document).

describe("documentFamily + family CHECK (C9)", () => {
  it("resolves every mapped type to its family", () => {
    for (const type of DOCUMENT_TYPES) {
      expect(documentFamily(type)).toBe(DOCUMENT_FAMILY[type]);
    }
  });

  it("groups the three families correctly", () => {
    const commercial = DOCUMENT_TYPES.filter(
      (t) => documentFamily(t) === "commercial"
    );
    const fiscal = DOCUMENT_TYPES.filter((t) => documentFamily(t) === "fiscal");
    const stock = DOCUMENT_TYPES.filter((t) => documentFamily(t) === "stock");
    expect(commercial).toEqual(["quote", "sales_order", "purchase_order"]);
    expect(fiscal).toEqual(["invoice", "credit_note", "receipt", "bill"]);
    expect(stock).toEqual(["goods_receipt", "adjustment", "transfer"]);
  });

  it("throws on an unknown type (no default branch)", () => {
    expect(() => documentFamily("not_a_real_type")).toThrow(
      "unknown document type"
    );
  });

  it("the DB CHECK on documents mirrors the TS resolver", () => {
    // The emitted migration SQL carries the family CHECK; assert every
    // (type, family) pair the resolver returns is present — guards drift.
    const documentsMigration = [...env.TEST_MIGRATIONS]
      .map((m) => m.queries.join("\n"))
      .find((sql) => sql.includes("documents_family_type_check"));
    expect(
      documentsMigration,
      "documents family CHECK migration must exist"
    ).toBeDefined();

    for (const [type, family] of Object.entries(DOCUMENT_FAMILY)) {
      expect(documentsMigration).toContain(
        `type = '${type}' AND family = '${family}'`
      );
    }
  });
});
