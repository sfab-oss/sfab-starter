import {
  addLineItem,
  createDocument,
  createSuccessor,
  finalizeDocument,
  getDocumentWithLines,
  updateLineItem,
} from "@workspace/core/transaction";
import { db } from "@workspace/db";
// biome-ignore lint/performance/noNamespaceImport: Schema barrel export
import * as schema from "@workspace/db/schema";

export async function seedUser(
  overrides?: Partial<typeof schema.user.$inferInsert>
) {
  const id = overrides?.id ?? crypto.randomUUID();
  const [user] = await db
    .insert(schema.user)
    .values({
      id,
      name: "Test User",
      email: `${id}@test.com`,
      emailVerified: true,
      ...overrides,
    })
    .returning();
  return user;
}

export async function seedOrganization(
  userId: string,
  overrides?: Partial<typeof schema.organization.$inferInsert>
) {
  const orgId = overrides?.id ?? crypto.randomUUID();
  const [org] = await db
    .insert(schema.organization)
    .values({
      id: orgId,
      name: "Test Org",
      slug: `test-org-${orgId.slice(0, 8)}`,
      ...overrides,
    })
    .returning();

  await db.insert(schema.member).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role: "owner",
  });

  return org;
}

export async function seedProduct(
  orgId: string,
  overrides?: Partial<typeof schema.products.$inferInsert>
) {
  const [product] = await db
    .insert(schema.products)
    .values({
      organizationId: orgId,
      sku: `SKU-${crypto.randomUUID().slice(0, 8)}`,
      name: "Test Product",
      price: 1999,
      minStockLevel: 10,
      ...overrides,
    })
    .returning();
  return product;
}

/**
 * Create + finalize an invoice with a single line, returning the document.
 * Convenience for settlement tests that need a finalized fiscal doc.
 */
export async function seedFinalizedInvoice(
  orgId: string,
  opts: {
    total: number;
    entityId?: string;
    entityName?: string;
    direction?: "sales" | "purchase";
    type?: "invoice" | "receipt" | "bill";
  }
) {
  const doc = await createDocument(orgId, {
    type: opts.type ?? "invoice",
    direction: opts.direction ?? "sales",
    entityId: opts.entityId,
    entityName: opts.entityName,
  });
  await addLineItem(orgId, doc.id, {
    description: "Test item",
    quantity: 1,
    unitPrice: opts.total,
  });
  await finalizeDocument(doc.id, orgId);
  // Re-fetch so callers get the finalized state (status, total, folio, etc.).
  const loaded = await getDocumentWithLines(doc.id, orgId);
  if (!loaded) {
    throw new Error("Failed to load finalized document");
  }
  return loaded.doc;
}

/**
 * Credit notes are successors only. Creates a finalized invoice, a credit-note
 * successor, optionally resizes the CN line to `creditTotal` (defaults to the
 * full invoice total), then finalizes the CN.
 */
export async function seedFinalizedCreditNote(
  orgId: string,
  opts: {
    total: number;
    /** When set, CN total differs from the source invoice (partial credit). */
    creditTotal?: number;
    entityId?: string;
    entityName?: string;
  }
) {
  const invoice = await seedFinalizedInvoice(orgId, {
    total: opts.total,
    entityId: opts.entityId,
    entityName: opts.entityName,
  });
  const successor = await createSuccessor(orgId, invoice.id, {
    type: "credit_note",
  });
  const creditTotal = opts.creditTotal ?? opts.total;
  if (creditTotal !== opts.total) {
    const line = successor.lines[0];
    if (!line) {
      throw new Error("Credit note successor has no lines");
    }
    await updateLineItem(orgId, successor.doc.id, line.id, {
      quantity: 1,
      unitPrice: creditTotal,
      discount: 0,
    });
  }
  await finalizeDocument(successor.doc.id, orgId);
  const loaded = await getDocumentWithLines(successor.doc.id, orgId);
  if (!loaded) {
    throw new Error("Failed to load finalized credit note");
  }
  return { creditNote: loaded.doc, invoice };
}
