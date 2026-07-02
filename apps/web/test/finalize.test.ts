import {
  addLineItem,
  createDocument,
  finalizeDocument,
  getDocumentWithLines,
} from "@workspace/core/transaction";
import { and, db, eq, sql } from "@workspace/db";
import { activityLog, documents, sequences } from "@workspace/db/schema";
import { beforeEach, describe, expect, it } from "vitest";
import { seedOrganization, seedUser } from "./helpers/seed";

let orgId: string;

beforeEach(async () => {
  const user = await seedUser();
  const org = await seedOrganization(user.id);
  orgId = org.id;
});

// AC-9 (C5): finalize is folio-atomic in one db.batch — folio bump + fiscal
// freeze commit or roll back together; frozen totals stay immutable while
// payment columns remain writable; taxTotal excludes withholdings; metadata.tax
// snapshot present.

describe("finalizeDocument — folio-atomic finalize (AC-9)", () => {
  it("draws a folio, freezes totals, writes the event + tax snapshot", async () => {
    const doc = await createDocument(orgId, {
      type: "invoice",
      direction: "sales",
      entityName: "Acme",
    });
    // 2 x 10.00 (1000 minor) = 2000; 16% tax (1600 bps) = 320; total = 2320
    await addLineItem(orgId, doc.id, {
      description: "Widget",
      quantity: 2,
      unitPrice: 1000,
      taxRate: 1600,
    });

    const result = await finalizeDocument(doc.id, orgId, { actorId: "u1" });

    expect(result.folio).toBe(1);
    expect(result.totals.subtotal).toBe(2000);
    expect(result.totals.taxTotal).toBe(320); // excludes withholdings
    expect(result.totals.total).toBe(2320);

    const loaded = await getDocumentWithLines(doc.id, orgId);
    expect(loaded?.doc.status).toBe("finalized");
    expect(loaded?.doc.folio).toBe(1);
    expect(loaded?.doc.balanceDue).toBe(2320); // projection default = total (writable)
    expect(loaded?.doc.metadata?.tax).toMatchObject({
      taxTotal: 320,
      taxableBase: 2000,
      currencyCode: "USD",
    });

    const events = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, doc.id));
    expect(events.some((e) => e.eventType === "document_finalized")).toBe(true);
  });

  it("draws sequential folios per (org, key)", async () => {
    const mk = async () => {
      const d = await createDocument(orgId, {
        type: "invoice",
        direction: "sales",
      });
      await addLineItem(orgId, d.id, {
        description: "Item",
        quantity: 1,
        unitPrice: 100,
      });
      return finalizeDocument(d.id, orgId);
    };
    expect((await mk()).folio).toBe(1);
    expect((await mk()).folio).toBe(2);
  });

  it("a failing batch statement rolls back the folio bump (atomicity)", async () => {
    await db.insert(sequences).values({
      organizationId: orgId,
      key: "rollback-test",
      next: 5,
    });
    const bump = db
      .update(sequences)
      .set({ next: sql`next + 1` })
      .where(
        and(
          eq(sequences.organizationId, orgId),
          eq(sequences.key, "rollback-test")
        )
      );
    // type/family mismatch violates the documents_family_type_check CHECK
    const bad = db.insert(documents).values({
      organizationId: orgId,
      type: "invoice",
      family: "commercial",
      direction: "sales",
    });

    await expect(db.batch([bump, bad])).rejects.toThrow();

    const [row] = await db
      .select()
      .from(sequences)
      .where(eq(sequences.key, "rollback-test"));
    expect(row.next).toBe(5); // the bump was rolled back — folio not consumed
  });

  it("refuses to re-finalize an already-finalized document (C5 immutable)", async () => {
    const doc = await createDocument(orgId, {
      type: "invoice",
      direction: "sales",
    });
    await addLineItem(orgId, doc.id, {
      description: "X",
      quantity: 1,
      unitPrice: 500,
    });
    await finalizeDocument(doc.id, orgId);
    await expect(finalizeDocument(doc.id, orgId)).rejects.toThrow(
      "already finalized"
    );
  });

  it("refuses a non-fiscal type (quote is commercial)", async () => {
    const doc = await createDocument(orgId, {
      type: "quote",
      direction: "sales",
    });
    await addLineItem(orgId, doc.id, {
      description: "X",
      quantity: 1,
      unitPrice: 500,
    });
    await expect(finalizeDocument(doc.id, orgId)).rejects.toThrow("fiscal");
  });

  it("refuses a document with no lines", async () => {
    const doc = await createDocument(orgId, {
      type: "invoice",
      direction: "sales",
    });
    await expect(finalizeDocument(doc.id, orgId)).rejects.toThrow(
      "no line items"
    );
  });

  it("rounds tax per line; header taxTotal = exact Σ of line taxes", async () => {
    const doc = await createDocument(orgId, {
      type: "invoice",
      direction: "sales",
    });
    // 9999 minor @ 16% = 1599.84 -> 1600 (rounded per line)
    await addLineItem(orgId, doc.id, {
      description: "A",
      quantity: 1,
      unitPrice: 9999,
      taxRate: 1600,
    });
    await addLineItem(orgId, doc.id, {
      description: "B",
      quantity: 1,
      unitPrice: 9999,
      taxRate: 1600,
    });
    const result = await finalizeDocument(doc.id, orgId);
    expect(result.totals.taxTotal).toBe(3200); // 1600 + 1600
  });
});
