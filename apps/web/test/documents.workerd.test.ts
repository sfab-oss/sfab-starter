import { listActivity } from "@workspace/core/activity";
import {
  acceptDocument,
  addLineItem,
  createDocument,
  createSuccessor,
  finalizeDocument,
  getDocumentWithLines,
  getPaginatedDocuments,
  removeLineItem,
  updateLineItem,
} from "@workspace/core/transaction";
import { beforeEach, describe, expect, it } from "vitest";
import { seedOrganization, seedUser } from "./helpers/seed";

const SUCCESSORS_RE = /successors/i;
const MODIFY_GUARD_RE = /finalized|Cannot modify/i;
const CONVERT_CONFLICT_RE = /accepted|converted|conflict/i;

let orgId: string;

beforeEach(async () => {
  const user = await seedUser();
  const org = await seedOrganization(user.id);
  orgId = org.id;
});

describe("createDocument — credit notes are successors only", () => {
  it("rejects standalone credit_note creation", async () => {
    await expect(
      createDocument(orgId, {
        type: "credit_note",
        direction: "sales",
      })
    ).rejects.toThrow(SUCCESSORS_RE);
  });
});

describe("line edit guards + credit-note sign normalize", () => {
  it("rejects line edits on a finalized document", async () => {
    const doc = await createDocument(orgId, {
      type: "invoice",
      direction: "sales",
    });
    const line = await addLineItem(orgId, doc.id, {
      description: "Widget",
      quantity: 1,
      unitPrice: 1000,
    });
    await finalizeDocument(doc.id, orgId);

    await expect(
      updateLineItem(orgId, doc.id, line.id, { quantity: 2 })
    ).rejects.toThrow(MODIFY_GUARD_RE);
    await expect(removeLineItem(orgId, doc.id, line.id)).rejects.toThrow(
      MODIFY_GUARD_RE
    );
  });

  it("normalizes positive qty/discount to negative on credit-note drafts", async () => {
    const invoice = await createDocument(orgId, {
      type: "invoice",
      direction: "sales",
    });
    await addLineItem(orgId, invoice.id, {
      description: "Widget",
      quantity: 2,
      unitPrice: 1000,
      discount: 200,
    });
    await finalizeDocument(invoice.id, orgId);

    const cn = await createSuccessor(orgId, invoice.id, {
      type: "credit_note",
    });
    const line = cn.lines[0];
    expect(line).toBeDefined();
    if (!line) {
      return;
    }
    expect(line.quantity).toBe(-2);
    expect(line.discount).toBe(-200);

    const updated = await updateLineItem(orgId, cn.doc.id, line.id, {
      quantity: 3,
      discount: 100,
    });
    expect(updated.quantity).toBe(-3);
    expect(updated.discount).toBe(-100);
  });
});

describe("acceptDocument + createSuccessor", () => {
  it("accepts a quote and converts to an invoice with lineage", async () => {
    const quote = await createDocument(orgId, {
      type: "quote",
      direction: "sales",
      entityName: "Acme",
    });
    await addLineItem(orgId, quote.id, {
      description: "Widget",
      quantity: 2,
      unitPrice: 1000,
      discount: 200,
      taxRate: 1600,
    });

    const accepted = await acceptDocument(orgId, quote.id);
    expect(accepted.status).toBe("accepted");
    expect(accepted.total).toBe(2088); // (2000-200)*1.16

    const invoice = await createSuccessor(orgId, quote.id, { type: "invoice" });
    expect(invoice.doc.type).toBe("invoice");
    expect(invoice.doc.status).toBe("draft");
    expect(invoice.doc.sourceDocumentId).toBe(quote.id);
    expect(invoice.doc.rootDocumentId).toBe(quote.id);
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.lines[0]?.quantity).toBe(2);
    expect(invoice.lines[0]?.discount).toBe(200);

    const parent = await getDocumentWithLines(quote.id, orgId);
    expect(parent?.doc.status).toBe("converted");
  });

  it("writes activity events for accept and quote-to-invoice convert", async () => {
    const quote = await createDocument(orgId, {
      type: "quote",
      direction: "sales",
      entityName: "Acme",
    });
    await addLineItem(orgId, quote.id, {
      description: "Widget",
      quantity: 1,
      unitPrice: 1000,
    });

    await acceptDocument(orgId, quote.id, { actorId: "user-test" });
    const quoteActivity = await listActivity(orgId, {
      entityType: "document",
      entityId: quote.id,
    });
    expect(
      quoteActivity.some((row) => row.eventType === "document_accepted")
    ).toBe(true);

    const invoice = await createSuccessor(
      orgId,
      quote.id,
      { type: "invoice" },
      { actorId: "user-test" }
    );
    const quoteAfterConvert = await listActivity(orgId, {
      entityType: "document",
      entityId: quote.id,
    });
    expect(
      quoteAfterConvert.some((row) => row.eventType === "quote_converted")
    ).toBe(true);

    const invoiceActivity = await listActivity(orgId, {
      entityType: "document",
      entityId: invoice.doc.id,
    });
    expect(
      invoiceActivity.some((row) => row.eventType === "document_created")
    ).toBe(true);
  });

  it("credit-note successor reverses qty+discount so taxableBase is exact negative", async () => {
    const invoice = await createDocument(orgId, {
      type: "invoice",
      direction: "sales",
    });
    await addLineItem(orgId, invoice.id, {
      description: "Widget",
      quantity: 2,
      unitPrice: 1000,
      discount: 200,
      taxRate: 1600,
    });
    await finalizeDocument(invoice.id, orgId);
    const source = await getDocumentWithLines(invoice.id, orgId);
    expect(source?.doc.total).toBe(2088);

    const cn = await createSuccessor(orgId, invoice.id, {
      type: "credit_note",
    });
    expect(cn.doc.type).toBe("credit_note");
    expect(cn.doc.sourceDocumentId).toBe(invoice.id);
    expect(cn.doc.reversesDocumentId).toBe(invoice.id);
    expect(cn.doc.rootDocumentId).toBe(invoice.id);

    const srcLine = source?.lines[0];
    const cnLine = cn.lines[0];
    expect(srcLine).toBeDefined();
    expect(cnLine).toBeDefined();
    if (!(srcLine && cnLine)) {
      return;
    }
    expect(cnLine.quantity).toBe(-Math.abs(srcLine.quantity));
    expect(cnLine.discount).toBe(-Math.abs(srcLine.discount));
    expect(cnLine.unitPrice).toBe(srcLine.unitPrice);
    expect(cnLine.taxableBase).toBe(-srcLine.taxableBase);
    expect(cn.draftTotals?.total).toBe(-(source?.doc.total ?? 0));
    expect(cn.draftTotals?.taxableBase).toBe(-srcLine.taxableBase);
  });

  it("second convert of the same quote conflicts", async () => {
    const quote = await createDocument(orgId, {
      type: "quote",
      direction: "sales",
    });
    await addLineItem(orgId, quote.id, {
      description: "Widget",
      quantity: 1,
      unitPrice: 500,
    });
    await acceptDocument(orgId, quote.id);
    await createSuccessor(orgId, quote.id, { type: "invoice" });

    await expect(
      createSuccessor(orgId, quote.id, { type: "invoice" })
    ).rejects.toThrow(CONVERT_CONFLICT_RE);
  });
});

describe("getPaginatedDocuments", () => {
  it("filters by type and search", async () => {
    const quote = await createDocument(orgId, {
      type: "quote",
      direction: "sales",
      entityName: "Alpha Co",
    });
    await createDocument(orgId, {
      type: "invoice",
      direction: "sales",
      entityName: "Beta Co",
    });

    const quotes = await getPaginatedDocuments(orgId, {
      page: 1,
      pageSize: 20,
      type: "quote",
    });
    expect(quotes.data.every((d) => d.type === "quote")).toBe(true);
    expect(quotes.data.some((d) => d.id === quote.id)).toBe(true);

    const search = await getPaginatedDocuments(orgId, {
      page: 1,
      pageSize: 20,
      search: "Alpha",
    });
    expect(search.data).toHaveLength(1);
    expect(search.data[0]?.entityName).toBe("Alpha Co");
  });
});
