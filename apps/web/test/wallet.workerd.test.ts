import {
  addLineItem,
  applyCreditNoteDisposition,
  createDocument,
  createEntity,
  depositCredit,
  finalizeDocument,
  getCreditBalance,
  getDocumentWithLines,
  getEntity,
  listCreditEntries,
  rebuildCreditBalance,
  rebuildEntityBalance,
  redeemCredit,
  redeemCreditByReference,
  reverseCreditEntry,
} from "@workspace/core/transaction";
// Raw source for the db.transaction static ban test.
import _wallet from "@workspace/core/transaction/wallet?raw";
import { db, eq } from "@workspace/db";
import { entities, paymentAllocations } from "@workspace/db/schema";
import { beforeEach, describe, expect, it } from "vitest";
import {
  seedFinalizedInvoice,
  seedOrganization,
  seedUser,
} from "./helpers/seed";

let orgId: string;

const TXN_BAN_RE = /\bdb\.transaction\b/;

beforeEach(async () => {
  const user = await seedUser();
  const org = await seedOrganization(user.id);
  orgId = org.id;
});

// ---------------------------------------------------------------------------
// AC-1: customer_credit is append-only; corrections are compensating rows
// ---------------------------------------------------------------------------

describe("wallet append-only (AC-1)", () => {
  it("deposits create positive rows; creditBalance is the SUM", async () => {
    const entity = await createEntity(orgId, {
      name: "Wallet Customer",
      type: "customer",
    });

    await depositCredit(orgId, {
      entityId: entity.id,
      amount: 500,
    });

    const balance = await getCreditBalance(entity.id, orgId);
    expect(balance).toBe(500);

    const entries = await listCreditEntries(orgId, { entityId: entity.id });
    expect(entries.length).toBe(1);
    expect(entries[0]?.amount).toBe(500);
    expect(entries[0]?.type).toBe("deposit");
  });

  it("reverseCreditEntry writes a compensating row, never UPDATE in place", async () => {
    const entity = await createEntity(orgId, {
      name: "Wallet Customer",
      type: "customer",
    });

    const { entryId } = await depositCredit(orgId, {
      entityId: entity.id,
      amount: 500,
    });

    await reverseCreditEntry(entryId, orgId, { reason: "Correction" });

    const balance = await getCreditBalance(entity.id, orgId);
    expect(balance).toBe(0);

    const entries = await listCreditEntries(orgId, { entityId: entity.id });
    expect(entries.length).toBe(2); // deposit + correction
    const correction = entries.find((e) => e.type === "correction");
    expect(correction?.amount).toBe(-500);

    // Original entry was never modified.
    const original = entries.find((e) => e.type === "deposit");
    expect(original?.amount).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// AC-2: Deposit lands wallet-only — never double-counted as AR (C1)
// ---------------------------------------------------------------------------

describe("wallet-only deposit — no AR double-count (AC-2, C1)", () => {
  it("a deposit creates no payment_allocations", async () => {
    const entity = await createEntity(orgId, {
      name: "Anticipo Customer",
      type: "customer",
    });

    await depositCredit(orgId, {
      entityId: entity.id,
      amount: 500,
    });

    const allocs = await db
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.organizationId, orgId));
    expect(allocs.length).toBe(0);
  });

  it("a deposit increases creditBalance but does not change AR", async () => {
    const entity = await createEntity(orgId, {
      name: "Anticipo Customer",
      type: "customer",
    });

    await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    // After finalize, entity.balance = 1000 (AR), creditBalance = 0.
    const before = await getEntity(entity.id, orgId);
    expect(before?.balance).toBe(1000);
    expect(before?.creditBalance).toBe(0);

    await depositCredit(orgId, {
      entityId: entity.id,
      amount: 300,
    });

    // creditBalance = 300, balance (net) = 1000 - 300 = 700.
    const after = await getEntity(entity.id, orgId);
    expect(after?.creditBalance).toBe(300);
    expect(after?.balance).toBe(700);
  });
});

// ---------------------------------------------------------------------------
// AC-3: Full conservation identity — entity.balance = AR − creditBalance
// ---------------------------------------------------------------------------

describe("full conservation identity (AC-3)", () => {
  it("entity.balance reflects both AR and creditBalance halves", async () => {
    const entity = await createEntity(orgId, {
      name: "Conservation Customer",
      type: "customer",
    });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    await depositCredit(orgId, {
      entityId: entity.id,
      amount: 300,
    });

    // AR = 1000, credit = 300 → balance = 700.
    let loaded = await getEntity(entity.id, orgId);
    expect(loaded?.balance).toBe(700);
    expect(loaded?.creditBalance).toBe(300);

    // Redeem 300 against the invoice — pays down AR, consumes credit.
    await redeemCredit(orgId, {
      entityId: entity.id,
      documentId: invoice.id,
      amount: 300,
    });

    // AR = 700 (1000 − 300 paid), credit = 0 → balance = 700.
    loaded = await getEntity(entity.id, orgId);
    expect(loaded?.balance).toBe(700);
    expect(loaded?.creditBalance).toBe(0);

    const docLoaded = await getDocumentWithLines(invoice.id, orgId);
    expect(docLoaded?.doc.amountPaid).toBe(300);
    expect(docLoaded?.doc.balanceDue).toBe(700);
  });

  it("rebuildCreditBalance recomputes from the full customer_credit scan", async () => {
    const entity = await createEntity(orgId, {
      name: "Rebuild Customer",
      type: "customer",
    });

    await depositCredit(orgId, { entityId: entity.id, amount: 500 });
    await depositCredit(orgId, { entityId: entity.id, amount: 200 });

    // Manually corrupt the projection.
    await db
      .update(entities)
      .set({ creditBalance: 999 })
      .where(eq(entities.id, entity.id));

    const rebuilt = await rebuildCreditBalance(entity.id, orgId);
    expect(rebuilt).toBe(700);
  });

  it("rebuildEntityBalance returns the NET (AR − creditBalance)", async () => {
    const entity = await createEntity(orgId, {
      name: "Net Customer",
      type: "customer",
    });

    await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    await depositCredit(orgId, { entityId: entity.id, amount: 400 });

    const netBalance = await rebuildEntityBalance(entity.id, orgId);
    expect(netBalance).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// AC-4: Walk-in matching — deposit → later redemption by reference (C3)
// ---------------------------------------------------------------------------

describe("walk-in matching by reference (AC-4, C3)", () => {
  it("walk-in deposit requires a reference", async () => {
    await expect(
      depositCredit(orgId, {
        entityId: null,
        amount: 500,
      })
    ).rejects.toThrow("reference");
  });

  it("deposit → redeem by reference against an invoice", async () => {
    // Walk-in deposit (no entityId, with reference).
    await depositCredit(orgId, {
      entityId: null,
      amount: 500,
      reference: "WALK-001",
    });

    // The walk-in returns later as a known entity with an invoice.
    const entity = await createEntity(orgId, {
      name: "Returning Walk-in",
      type: "customer",
    });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 500,
      entityId: entity.id,
      entityName: entity.name,
    });

    const result = await redeemCreditByReference(orgId, {
      reference: "WALK-001",
      entityId: entity.id,
      documentId: invoice.id,
      amount: 500,
    });

    expect(result.paymentId).toBeTruthy();

    // Document fully paid.
    const loaded = await getDocumentWithLines(invoice.id, orgId);
    expect(loaded?.doc.paymentStatus).toBe("paid");
    expect(loaded?.doc.balanceDue).toBe(0);

    // Entity creditBalance nets to zero (claim +500, redemption −500).
    const balance = await getCreditBalance(entity.id, orgId);
    expect(balance).toBe(0);
  });

  it("rejects double-claim of the same reference", async () => {
    await depositCredit(orgId, {
      entityId: null,
      amount: 500,
      reference: "WALK-002",
    });

    const entity = await createEntity(orgId, {
      name: "Claimer",
      type: "customer",
    });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 500,
      entityId: entity.id,
      entityName: entity.name,
    });

    await redeemCreditByReference(orgId, {
      reference: "WALK-002",
      entityId: entity.id,
      documentId: invoice.id,
      amount: 500,
    });

    // Second claim should fail.
    const invoice2 = await seedFinalizedInvoice(orgId, {
      total: 500,
      entityId: entity.id,
      entityName: entity.name,
    });

    await expect(
      redeemCreditByReference(orgId, {
        reference: "WALK-002",
        entityId: entity.id,
        documentId: invoice2.id,
        amount: 500,
      })
    ).rejects.toThrow("already been claimed");
  });

  it("rejects reference with insufficient walk-in credit", async () => {
    await depositCredit(orgId, {
      entityId: null,
      amount: 200,
      reference: "WALK-003",
    });

    const entity = await createEntity(orgId, {
      name: "Greedy",
      type: "customer",
    });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 500,
      entityId: entity.id,
      entityName: entity.name,
    });

    await expect(
      redeemCreditByReference(orgId, {
        reference: "WALK-003",
        entityId: entity.id,
        documentId: invoice.id,
        amount: 500,
      })
    ).rejects.toThrow("Insufficient");
  });
});

// ---------------------------------------------------------------------------
// AC-5: store_credit disposition — credit note → wallet → redeem
// ---------------------------------------------------------------------------

describe("store_credit disposition (AC-5)", () => {
  async function seedCreditNote(total: number, entityId?: string) {
    const cn = await createDocument(orgId, {
      type: "credit_note",
      direction: "sales",
      entityId,
      entityName: entityId ? "CN Customer" : undefined,
    });
    await addLineItem(orgId, cn.id, {
      description: "Return",
      quantity: -1,
      unitPrice: total,
    });
    await finalizeDocument(cn.id, orgId);
    return cn;
  }

  it("store_credit settles the CN and deposits to the wallet", async () => {
    const entity = await createEntity(orgId, {
      name: "Return Customer",
      type: "customer",
    });

    await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    const cn = await seedCreditNote(200, entity.id);

    const result = await applyCreditNoteDisposition(
      cn.id,
      orgId,
      "store_credit"
    );
    expect(result.paymentId).toBeTruthy();

    // CN settled.
    const cnLoaded = await getDocumentWithLines(cn.id, orgId);
    expect(cnLoaded?.doc.balanceDue).toBe(0);

    // Wallet credited.
    const entityLoaded = await getEntity(entity.id, orgId);
    expect(entityLoaded?.creditBalance).toBe(200);

    // Net balance = 1000 AR − 200 credit = 800.
    expect(entityLoaded?.balance).toBe(800);
  });

  it("full flow: return → store credit → redeem against invoice", async () => {
    const entity = await createEntity(orgId, {
      name: "Full Flow Customer",
      type: "customer",
    });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    const cn = await seedCreditNote(300, entity.id);

    // Disposition → wallet gets 300.
    await applyCreditNoteDisposition(cn.id, orgId, "store_credit");

    // Redeem the 300 against the invoice.
    await redeemCredit(orgId, {
      entityId: entity.id,
      documentId: invoice.id,
      amount: 300,
    });

    const docLoaded = await getDocumentWithLines(invoice.id, orgId);
    expect(docLoaded?.doc.amountPaid).toBe(300);
    expect(docLoaded?.doc.balanceDue).toBe(700);

    const entityLoaded = await getEntity(entity.id, orgId);
    expect(entityLoaded?.creditBalance).toBe(0);
    expect(entityLoaded?.balance).toBe(700);
  });

  it("store_credit rejects a credit note without entityId", async () => {
    const cn = await seedCreditNote(200);

    await expect(
      applyCreditNoteDisposition(cn.id, orgId, "store_credit")
    ).rejects.toThrow("entityId");
  });
});

// ---------------------------------------------------------------------------
// Redeem credit — edge cases
// ---------------------------------------------------------------------------

describe("redeemCredit edge cases", () => {
  it("rejects redemption with insufficient credit balance", async () => {
    const entity = await createEntity(orgId, {
      name: "Poor Customer",
      type: "customer",
    });

    await depositCredit(orgId, { entityId: entity.id, amount: 100 });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 500,
      entityId: entity.id,
      entityName: entity.name,
    });

    await expect(
      redeemCredit(orgId, {
        entityId: entity.id,
        documentId: invoice.id,
        amount: 500,
      })
    ).rejects.toThrow("Insufficient");
  });

  it("rejects redemption exceeding document balance due", async () => {
    const entity = await createEntity(orgId, {
      name: "Overpay Customer",
      type: "customer",
    });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 200,
      entityId: entity.id,
      entityName: entity.name,
    });

    await depositCredit(orgId, { entityId: entity.id, amount: 500 });

    await expect(
      redeemCredit(orgId, {
        entityId: entity.id,
        documentId: invoice.id,
        amount: 500,
      })
    ).rejects.toThrow("exceeds document balance");
  });

  it("rejects redemption against another entity's document", async () => {
    // The redeeming entity has ample credit...
    const payer = await createEntity(orgId, {
      name: "Payer",
      type: "customer",
    });
    await depositCredit(orgId, { entityId: payer.id, amount: 500 });

    // ...but the invoice belongs to a DIFFERENT entity.
    const other = await createEntity(orgId, {
      name: "Other",
      type: "customer",
    });
    const invoice = await seedFinalizedInvoice(orgId, {
      total: 500,
      entityId: other.id,
      entityName: other.name,
    });

    await expect(
      redeemCredit(orgId, {
        entityId: payer.id,
        documentId: invoice.id,
        amount: 300,
      })
    ).rejects.toThrow("belongs to a different entity");

    // The payer's wallet was not debited — the batch never ran.
    const balance = await getCreditBalance(payer.id, orgId);
    expect(balance).toBe(500);
    const payerLoaded = await getEntity(payer.id, orgId);
    expect(payerLoaded?.creditBalance).toBe(500);
  });

  it("partial redemption leaves remainder in wallet", async () => {
    const entity = await createEntity(orgId, {
      name: "Partial Customer",
      type: "customer",
    });

    await depositCredit(orgId, { entityId: entity.id, amount: 500 });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 1000,
      entityId: entity.id,
      entityName: entity.name,
    });

    await redeemCredit(orgId, {
      entityId: entity.id,
      documentId: invoice.id,
      amount: 300,
    });

    const entityLoaded = await getEntity(entity.id, orgId);
    expect(entityLoaded?.creditBalance).toBe(200);

    const docLoaded = await getDocumentWithLines(invoice.id, orgId);
    expect(docLoaded?.doc.amountPaid).toBe(300);
    expect(docLoaded?.doc.balanceDue).toBe(700);
  });

  it("fires sale_completed when redemption fully pays a document", async () => {
    const entity = await createEntity(orgId, {
      name: "Wallet Payoff",
      type: "customer",
    });

    const invoice = await seedFinalizedInvoice(orgId, {
      total: 500,
      entityId: entity.id,
      entityName: entity.name,
    });

    await depositCredit(orgId, { entityId: entity.id, amount: 500 });

    const result = await redeemCredit(orgId, {
      entityId: entity.id,
      documentId: invoice.id,
      amount: 500,
    });

    expect(result.completedSales).toEqual([invoice.id]);
  });
});

// ---------------------------------------------------------------------------
// AC-2 supplementary: no db.transaction in wallet.ts
// ---------------------------------------------------------------------------

describe("db.transaction ban (wallet)", () => {
  it("wallet.ts never calls db.transaction", () => {
    if (TXN_BAN_RE.test(_wallet)) {
      throw new Error("wallet.ts calls db.transaction — banned on D1 (AC-2)");
    }
  });
});
