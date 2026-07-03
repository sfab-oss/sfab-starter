import {
  addLineItem,
  applyCreditNoteDisposition,
  createDocument,
  createEntity,
  finalizeDocument,
  getDocumentWithLines,
  getEntity,
  rebuildDocumentPayment,
  rebuildEntityBalance,
  recordPayment,
  reversePayment,
} from "@workspace/core/transaction";
// Raw source for the db.transaction static ban test (resolved by Vite at build
// time — the Workers pool can't read the filesystem at runtime).
import _cn from "@workspace/core/transaction/credit-note?raw";
import _docs from "@workspace/core/transaction/documents?raw";
import _ent from "@workspace/core/transaction/entities?raw";
import _fam from "@workspace/core/transaction/family?raw";
import _fin from "@workspace/core/transaction/finalize?raw";
import _grd from "@workspace/core/transaction/guards?raw";
import _idx from "@workspace/core/transaction/index?raw";
import _pay from "@workspace/core/transaction/payments?raw";
import _proj from "@workspace/core/transaction/projections?raw";
import _tot from "@workspace/core/transaction/totals?raw";
import _wallet from "@workspace/core/transaction/wallet?raw";
import { db, eq } from "@workspace/db";
import {
  activityLog,
  documents,
  paymentAllocations,
} from "@workspace/db/schema";
import { beforeEach, describe, expect, it } from "vitest";
import {
  seedFinalizedInvoice,
  seedOrganization,
  seedUser,
} from "./helpers/seed";

let orgId: string;

const TXN_BAN_RE = /\bdb\.transaction\b/;

const txSources: Record<string, string> = {
  "credit-note.ts": _cn,
  "documents.ts": _docs,
  "entities.ts": _ent,
  "family.ts": _fam,
  "finalize.ts": _fin,
  "guards.ts": _grd,
  "index.ts": _idx,
  "payments.ts": _pay,
  "projections.ts": _proj,
  "totals.ts": _tot,
  "wallet.ts": _wallet,
};

beforeEach(async () => {
  const user = await seedUser();
  const org = await seedOrganization(user.id);
  orgId = org.id;
});

// ---------------------------------------------------------------------------
// AC-2: recordPayment is a single db.batch — no db.transaction
// ---------------------------------------------------------------------------

describe("recordPayment — batch atomicity (AC-2)", () => {
  it("records a payment and updates document projections in one batch", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    const result = await recordPayment(orgId, {
      amount: 1000,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 1000 }],
    });

    expect(result.paymentId).toBeTruthy();
    expect(result.touchedDocuments).toEqual([doc.id]);

    const loaded = await getDocumentWithLines(doc.id, orgId);
    expect(loaded?.doc.amountPaid).toBe(1000);
    expect(loaded?.doc.balanceDue).toBe(0);
    expect(loaded?.doc.paymentStatus).toBe("paid");
  });

  it("rejects allocations against non-fiscal documents", async () => {
    const quote = await createDocument(orgId, {
      type: "quote",
      direction: "sales",
    });
    await addLineItem(orgId, quote.id, {
      description: "X",
      quantity: 1,
      unitPrice: 500,
    });

    await expect(
      recordPayment(orgId, {
        amount: 500,
        method: "cash",
        allocations: [{ documentId: quote.id, amount: 500 }],
      })
    ).rejects.toThrow("fiscal");
  });

  it("rejects allocations against draft (un-finalized) documents", async () => {
    const doc = await createDocument(orgId, {
      type: "invoice",
      direction: "sales",
    });
    await addLineItem(orgId, doc.id, {
      description: "X",
      quantity: 1,
      unitPrice: 500,
    });

    await expect(
      recordPayment(orgId, {
        amount: 500,
        method: "cash",
        allocations: [{ documentId: doc.id, amount: 500 }],
      })
    ).rejects.toThrow("finalized");
  });
});

// ---------------------------------------------------------------------------
// AC-3: Projections are derived; reversals are compensating rows
// ---------------------------------------------------------------------------

describe("projections + reversals (AC-3)", () => {
  it("rebuildDocumentPayment recomputes from the full allocation scan", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    await recordPayment(orgId, {
      amount: 400,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 400 }],
    });

    // Manually corrupt the projection, then rebuild.
    await db
      .update(documents)
      .set({ amountPaid: 999, balanceDue: 1, paymentStatus: "partial" })
      .where(eq(documents.id, doc.id));

    const rebuilt = await rebuildDocumentPayment(doc.id, orgId);
    expect(rebuilt.amountPaid).toBe(400);
    expect(rebuilt.balanceDue).toBe(600);
    expect(rebuilt.paymentStatus).toBe("partial");
  });

  it("reversePayment writes compensating rows and rebuilds to correct balances", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    const payResult = await recordPayment(orgId, {
      amount: 1000,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 1000 }],
    });

    // Verify paid.
    let loaded = await getDocumentWithLines(doc.id, orgId);
    expect(loaded?.doc.paymentStatus).toBe("paid");

    // Reverse the payment.
    await reversePayment(payResult.paymentId, orgId);

    // Document should be back to unpaid after reversal.
    loaded = await getDocumentWithLines(doc.id, orgId);
    expect(loaded?.doc.amountPaid).toBe(0);
    expect(loaded?.doc.balanceDue).toBe(1000);
    expect(loaded?.doc.paymentStatus).toBe("unpaid");

    // The original allocations are marked reversedAt.
    const allocs = await db
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.documentId, doc.id));
    expect(allocs.length).toBe(2); // original + compensating
    const originals = allocs.filter((a) => a.reversedAt !== null);
    expect(originals.length).toBe(1);
  });

  it("refuses to reverse an already-reversed payment", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 500 });

    const payResult = await recordPayment(orgId, {
      amount: 500,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 500 }],
    });

    await reversePayment(payResult.paymentId, orgId);
    await expect(reversePayment(payResult.paymentId, orgId)).rejects.toThrow(
      "already reversed"
    );
  });
});

// ---------------------------------------------------------------------------
// AC-4: Conservation — Σ allocations = amountPaid; entity.balance; AP isolation
// ---------------------------------------------------------------------------

describe("conservation (AC-4)", () => {
  it("partial payment leaves the document open with correct balance", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    await recordPayment(orgId, {
      amount: 300,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 300 }],
    });

    const loaded = await getDocumentWithLines(doc.id, orgId);
    expect(loaded?.doc.amountPaid).toBe(300);
    expect(loaded?.doc.balanceDue).toBe(700);
    expect(loaded?.doc.paymentStatus).toBe("partial");
  });

  it("overpayment pushes balanceDue negative (projections are faithful)", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    // Full payment.
    await recordPayment(orgId, {
      amount: 1000,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 1000 }],
    });

    // Second payment — overpay by 200. The system does not reject this
    // (the wallet, ALW-355, will handle remainders); projections faithfully
    // reflect the sum.
    await recordPayment(orgId, {
      amount: 200,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 200 }],
    });

    const loaded = await getDocumentWithLines(doc.id, orgId);
    expect(loaded?.doc.amountPaid).toBe(1200);
    expect(loaded?.doc.balanceDue).toBe(-200);
    expect(loaded?.doc.paymentStatus).toBe("paid");
  });

  it("rejects duplicate documentId in allocations", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    await expect(
      recordPayment(orgId, {
        amount: 500,
        method: "cash",
        allocations: [
          { documentId: doc.id, amount: 300 },
          { documentId: doc.id, amount: 200 },
        ],
      })
    ).rejects.toThrow("Duplicate documentId");
  });

  it("AP isolation: supplier bills (purchase direction) do not affect entity AR balance", async () => {
    const entity = await createEntity(orgId, {
      name: "Test Customer",
      type: "customer",
    });

    // Create a sales invoice (AR).
    await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    // Create a supplier bill (AP) for the same entity.
    await seedFinalizedInvoice(orgId, {
      total: 500,
      entityId: entity.id,
      entityName: entity.name,
      direction: "purchase",
      type: "bill",
    });

    // Rebuild entity balance — should only include the sales invoice.
    const balance = await rebuildEntityBalance(entity.id, orgId);
    expect(balance).toBe(1000); // AR only, not AP
  });

  it("entity.balance updates after recording a payment", async () => {
    const entity = await createEntity(orgId, {
      name: "Test Customer",
      type: "customer",
    });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    // After finalize, rebuild entity balance.
    await rebuildEntityBalance(entity.id, orgId);

    // Record a payment against the invoice.
    await recordPayment(orgId, {
      amount: 600,
      method: "cash",
      entityId: entity.id,
      allocations: [{ documentId: invoice.id, amount: 600 }],
    });

    // After payment of 600, balance due = 400.
    const loaded = await getDocumentWithLines(invoice.id, orgId);
    expect(loaded?.doc.balanceDue).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AC-5: Allocation UPSERT — re-allocating same pair updates, not inserts
// ---------------------------------------------------------------------------

describe("allocation UPSERT (AC-5)", () => {
  it("onConflictDoUpdate prevents duplicate (paymentId, documentId) rows", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    // Record a payment.
    const result = await recordPayment(orgId, {
      amount: 500,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 500 }],
    });

    // Insert a second allocation for the same (paymentId, documentId) pair
    // via raw insert with onConflictDoUpdate.
    const { createId } = await import("@workspace/db");
    await db
      .insert(paymentAllocations)
      .values({
        id: createId("alloc"),
        organizationId: orgId,
        paymentId: result.paymentId,
        documentId: doc.id,
        amount: 700, // updated amount
        effectiveAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [
          paymentAllocations.organizationId,
          paymentAllocations.paymentId,
          paymentAllocations.documentId,
        ],
        set: {
          amount: 700,
          updatedAt: new Date().toISOString(),
        },
      });

    // Verify only one allocation row for this pair.
    const allocs = await db
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, result.paymentId));
    expect(allocs.length).toBe(1);
    expect(allocs[0]?.amount).toBe(700);
  });
});

// ---------------------------------------------------------------------------
// AC-6: Credit-note disposition routing
// ---------------------------------------------------------------------------

describe("credit-note disposition (AC-6)", () => {
  async function seedCreditNote(total: number, entityId?: string) {
    const cn = await createDocument(orgId, {
      type: "credit_note",
      direction: "sales",
      entityId,
      entityName: entityId ? "CN Customer" : undefined,
    });
    await addLineItem(orgId, cn.id, {
      description: "Return",
      quantity: -1, // negative to produce a negative total
      unitPrice: total,
    });
    await finalizeDocument(cn.id, orgId);
    return cn;
  }

  it("store_credit deposits to the wallet (ALW-355)", async () => {
    const entity = await createEntity(orgId, {
      name: "Store Credit Customer",
      type: "customer",
    });
    const cn = await seedCreditNote(200, entity.id);

    const result = await applyCreditNoteDisposition(
      cn.id,
      orgId,
      "store_credit"
    );
    expect(result.paymentId).toBeTruthy();

    const loaded = await getDocumentWithLines(cn.id, orgId);
    expect(loaded?.doc.balanceDue).toBe(0);
  });

  it("cash_refund settles the credit note with a negative payment", async () => {
    const cn = await seedCreditNote(200);

    const result = await applyCreditNoteDisposition(
      cn.id,
      orgId,
      "cash_refund"
    );
    expect(result.paymentId).toBeTruthy();

    const loaded = await getDocumentWithLines(cn.id, orgId);
    expect(loaded?.doc.balanceDue).toBe(0); // settled
  });

  it("apply_to_document settles the credit note and reduces target doc balance", async () => {
    const entity = await createEntity(orgId, {
      name: "CN Customer",
      type: "customer",
    });

    // Target invoice: 1000 unpaid.
    const invoice = await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    const cn = await seedCreditNote(200, entity.id);

    const result = await applyCreditNoteDisposition(
      cn.id,
      orgId,
      "apply_to_document",
      { targetDocumentId: invoice.id }
    );
    expect(result.paymentId).toBeTruthy();

    // Credit note settled.
    const cnLoaded = await getDocumentWithLines(cn.id, orgId);
    expect(cnLoaded?.doc.balanceDue).toBe(0);

    // Target invoice: 200 credit applied, balanceDue reduced from 1000 to 800.
    const invLoaded = await getDocumentWithLines(invoice.id, orgId);
    expect(invLoaded?.doc.amountPaid).toBe(200);
    expect(invLoaded?.doc.balanceDue).toBe(800);
    expect(invLoaded?.doc.paymentStatus).toBe("partial");
  });

  it("apply_to_document rejects cross-entity application (F3)", async () => {
    const entityA = await createEntity(orgId, {
      name: "Customer A",
      type: "customer",
    });
    const entityB = await createEntity(orgId, {
      name: "Customer B",
      type: "customer",
    });

    // Invoice for entity B.
    const invoice = await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entityB.id,
      entityName: entityB.name,
    });

    // Credit note for entity A.
    const cn = await createDocument(orgId, {
      type: "credit_note",
      direction: "sales",
      entityId: entityA.id,
      entityName: entityA.name,
    });
    await addLineItem(orgId, cn.id, {
      description: "Return",
      quantity: -1,
      unitPrice: 200,
    });
    await finalizeDocument(cn.id, orgId);

    await expect(
      applyCreditNoteDisposition(cn.id, orgId, "apply_to_document", {
        targetDocumentId: invoice.id,
      })
    ).rejects.toThrow("same entity");
  });
});

// ---------------------------------------------------------------------------
// AC-7: sale_completed vs document_finalized
// ---------------------------------------------------------------------------

describe("sale_completed event (AC-7)", () => {
  it("fires when a payment brings paymentStatus to 'paid'", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    // Finalize fires document_finalized, NOT sale_completed (unpaid at finalize).
    const finalizeEvents = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, doc.id));
    expect(
      finalizeEvents.some((e) => e.eventType === "document_finalized")
    ).toBe(true);
    expect(finalizeEvents.some((e) => e.eventType === "sale_completed")).toBe(
      false
    );

    // Full payment → sale_completed fires.
    await recordPayment(orgId, {
      amount: 1000,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 1000 }],
    });

    const events = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, doc.id));
    expect(events.some((e) => e.eventType === "sale_completed")).toBe(true);
  });

  it("does NOT fire on a partial payment (fiado scenario)", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    await recordPayment(orgId, {
      amount: 400,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 400 }],
    });

    const events = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, doc.id));
    expect(events.some((e) => e.eventType === "sale_completed")).toBe(false);
  });

  it("fires on the SECOND payment that completes the sale (split payment)", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    // First partial payment — no sale_completed.
    await recordPayment(orgId, {
      amount: 600,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 600 }],
    });

    let events = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, doc.id));
    expect(events.some((e) => e.eventType === "sale_completed")).toBe(false);

    // Second payment completes the sale.
    await recordPayment(orgId, {
      amount: 400,
      method: "cash",
      allocations: [{ documentId: doc.id, amount: 400 }],
    });

    events = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, doc.id));
    expect(events.some((e) => e.eventType === "sale_completed")).toBe(true);
  });

  it("does NOT fire when a purchase bill is fully paid (B1 regression)", async () => {
    const bill = await seedFinalizedInvoice(orgId, {
      total: 500,
      direction: "purchase",
      type: "bill",
    });

    await recordPayment(orgId, {
      amount: 500,
      method: "cash",
      allocations: [{ documentId: bill.id, amount: 500 }],
    });

    const events = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, bill.id));
    expect(events.some((e) => e.eventType === "sale_completed")).toBe(false);
  });

  it("does NOT fire when a credit note is settled via cash_refund (B1 regression)", async () => {
    const cn = await createDocument(orgId, {
      type: "credit_note",
      direction: "sales",
    });
    await addLineItem(orgId, cn.id, {
      description: "Return",
      quantity: -1,
      unitPrice: 200,
    });
    await finalizeDocument(cn.id, orgId);

    await applyCreditNoteDisposition(cn.id, orgId, "cash_refund");

    const events = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.entityId, cn.id));
    expect(events.some((e) => e.eventType === "sale_completed")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Entity balance maintenance + credit-limit enforcement (review F1, F2, F4, F6)
// ---------------------------------------------------------------------------

describe("entity balance + credit-limit (F1, F2, F4, F6)", () => {
  it("finalize updates entity.balance so the next credit-limit check sees it (F1)", async () => {
    const entity = await createEntity(orgId, {
      name: "Credit Customer",
      type: "customer",
      creditLimit: 1500,
    });

    // First finalize: 1000, under 1500 limit.
    await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    // Entity balance should now be 1000 (updated by the finalize batch).
    const updated = await getEntity(entity.id, orgId);
    expect(updated?.balance).toBe(1000);

    // Second finalize: 1000 more → projected 2000 > 1500 → should throw.
    await expect(
      seedFinalizedInvoice(orgId, {
        total: 1000,
        entityId: entity.id,
        entityName: entity.name,
      })
    ).rejects.toThrow("Credit limit exceeded");
  });

  it("entity.balance updates from doc entityIds even without input.entityId (F2)", async () => {
    const entity = await createEntity(orgId, {
      name: "Test Customer",
      type: "customer",
    });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    // Payment WITHOUT input.entityId — the demo form does this.
    await recordPayment(orgId, {
      amount: 600,
      method: "cash",
      allocations: [{ documentId: invoice.id, amount: 600 }],
    });

    // Entity balance should be 400 (1000 - 600), derived from the doc.
    const updated = await getEntity(entity.id, orgId);
    expect(updated?.balance).toBe(400);
  });

  it("idempotencyKey returns existing payment on retry with stored allocations (F3)", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    const result1 = await recordPayment(orgId, {
      amount: 1000,
      method: "cash",
      idempotencyKey: "retry-test-1",
      allocations: [{ documentId: doc.id, amount: 1000 }],
    });

    const result2 = await recordPayment(orgId, {
      amount: 1000,
      method: "cash",
      idempotencyKey: "retry-test-1",
      allocations: [{ documentId: doc.id, amount: 1000 }],
    });

    expect(result2.paymentId).toBe(result1.paymentId);
    expect(result2.touchedDocuments).toEqual([doc.id]);
  });

  it("idempotencyKey with mismatched amount throws conflict (F3)", async () => {
    const doc = await seedFinalizedInvoice(orgId, { total: 1000 });

    await recordPayment(orgId, {
      amount: 1000,
      method: "cash",
      idempotencyKey: "reuse-test",
      allocations: [{ documentId: doc.id, amount: 1000 }],
    });

    await expect(
      recordPayment(orgId, {
        amount: 500,
        method: "cash",
        idempotencyKey: "reuse-test",
        allocations: [{ documentId: doc.id, amount: 500 }],
      })
    ).rejects.toThrow("already used");
  });

  it("finalized credit note has paymentStatus 'paid' (F6)", async () => {
    const cn = await createDocument(orgId, {
      type: "credit_note",
      direction: "sales",
    });
    await addLineItem(orgId, cn.id, {
      description: "Return",
      quantity: -1,
      unitPrice: 200,
    });
    await finalizeDocument(cn.id, orgId);

    const loaded = await getDocumentWithLines(cn.id, orgId);
    expect(loaded?.doc.paymentStatus).toBe("paid");
  });
});

// ---------------------------------------------------------------------------
// AC-2 supplementary: no db.transaction in the diff
// ---------------------------------------------------------------------------

describe("db.transaction ban (AC-2)", () => {
  it("the core transaction package never calls db.transaction", () => {
    // D1 has no interactive transactions; the ban is a code-level invariant.
    // Source files are imported as raw strings at build time (the Workers pool
    // cannot read the filesystem at runtime). If a new file is added to
    // core/transaction, add its raw import above.
    for (const [file, content] of Object.entries(txSources)) {
      if (TXN_BAN_RE.test(content)) {
        throw new Error(`${file} calls db.transaction — banned on D1 (AC-2)`);
      }
    }
  });
});
