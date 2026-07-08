import { getOrgAgentReadOnlyTools, getOrgAgentTools } from "@workspace/agent";
import {
  createEntity,
  depositCredit,
  recordPayment,
} from "@workspace/core/transaction";
import { beforeEach, describe, expect, it } from "vitest";
import {
  seedFinalizedInvoice,
  seedOrganization,
  seedUser,
} from "./helpers/seed";

/**
 * ALW-402 — read-only reach into the transaction core, people/entities, and org
 * settings. These drive the tools through the real composition
 * (`getOrgAgentReadOnlyTools`) against seeded D1 state and assert every read is
 * scoped to the caller's org (AC-1/AC-2). The mutation invariant (AC-3) is
 * asserted on the tool names.
 */

// The tool `execute` is loosely typed here so tests can invoke it without
// threading the AI SDK's full ToolCallOptions/zod-inferred input types.
interface LooseTool {
  execute?: (input: unknown, opts: unknown) => Promise<unknown>;
}
const EXEC_OPTS = { toolCallId: "test", messages: [] };

async function run<T>(
  tools: Record<string, unknown>,
  name: string,
  input: unknown
): Promise<T> {
  const exec = (tools[name] as LooseTool | undefined)?.execute;
  if (!exec) {
    throw new Error(`tool "${name}" has no execute`);
  }
  return (await exec(input, EXEC_OPTS)) as T;
}

const MUTATING_TOOL_NAME = /create|update|delete|write|void|reverse/;

let orgId: string;
let otherOrgId: string;
let entityId: string;
let invoiceId: string;
let paymentId: string;

beforeEach(async () => {
  const user = await seedUser();
  const org = await seedOrganization(user.id);
  orgId = org.id;

  const entity = await createEntity(orgId, {
    name: "Acme Customer",
    type: "customer",
  });
  entityId = entity.id;

  const invoice = await seedFinalizedInvoice(orgId, {
    total: 1000,
    entityId,
    entityName: entity.name,
  });
  invoiceId = invoice.id;

  const payment = await recordPayment(orgId, {
    amount: 400,
    method: "cash",
    entityId,
    allocations: [{ documentId: invoiceId, amount: 400 }],
  });
  paymentId = payment.paymentId;

  await depositCredit(orgId, { entityId, amount: 300 });

  // A second org with its own state — every read must be blind to it.
  const otherUser = await seedUser();
  const otherOrg = await seedOrganization(otherUser.id);
  otherOrgId = otherOrg.id;
  const otherEntity = await createEntity(otherOrgId, {
    name: "Other Customer",
    type: "customer",
  });
  const otherInvoice = await seedFinalizedInvoice(otherOrgId, {
    total: 500,
    entityId: otherEntity.id,
    entityName: otherEntity.name,
  });
  await recordPayment(otherOrgId, {
    amount: 500,
    method: "cash",
    entityId: otherEntity.id,
    allocations: [{ documentId: otherInvoice.id, amount: 500 }],
  });
});

describe("transaction-core read tools (AC-1)", () => {
  it("list-payments returns only this org's payments", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const rows = await run<
      Array<{ id: string; amount: number; organizationId: string }>
    >(tools, "list-payments", {});
    // Every row is org-scoped, and the recorded 400 payment is present.
    for (const row of rows) {
      expect(row.organizationId).toBe(orgId);
    }
    expect(rows.find((p) => p.id === paymentId)?.amount).toBe(400);
  });

  it("list-payments can filter to one entity", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const mine = await run<Array<{ id: string; entityId: string | null }>>(
      tools,
      "list-payments",
      { entityId }
    );
    expect(mine.length).toBeGreaterThan(0);
    for (const row of mine) {
      expect(row.entityId).toBe(entityId);
    }
    expect(mine.some((p) => p.id === paymentId)).toBe(true);
    const none = await run<unknown[]>(tools, "list-payments", {
      entityId: "ent_missing",
    });
    expect(none.length).toBe(0);
  });

  it("list-payments caps returned rows at the requested limit", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    // The org has >1 payment (the recorded payment + the wallet deposit).
    const all = await run<unknown[]>(tools, "list-payments", {});
    expect(all.length).toBeGreaterThan(1);
    const capped = await run<unknown[]>(tools, "list-payments", { limit: 1 });
    expect(capped.length).toBe(1);
  });

  it("get-payment returns the payment with its allocations", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const result = await run<{
      payment: { id: string; amount: number };
      allocations: Array<{ documentId: string; amount: number }>;
    } | null>(tools, "get-payment", { id: paymentId });
    expect(result?.payment.id).toBe(paymentId);
    expect(result?.allocations).toHaveLength(1);
    expect(result?.allocations[0]?.documentId).toBe(invoiceId);
    expect(result?.allocations[0]?.amount).toBe(400);
  });

  it("get-payment is null for another org's payment id", async () => {
    const otherTools = getOrgAgentReadOnlyTools({ organizationId: otherOrgId });
    const leaked = await run<unknown>(otherTools, "get-payment", {
      id: paymentId,
    });
    expect(leaked).toBeNull();
  });

  it("get-document exposes the settlement projection (amount paid / status)", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const doc = await run<{
      doc: { id: string; amountPaid: number; paymentStatus: string };
      lines: unknown[];
    } | null>(tools, "get-document", { id: invoiceId });
    expect(doc?.doc.id).toBe(invoiceId);
    expect(doc?.doc.amountPaid).toBe(400);
    expect(doc?.doc.paymentStatus).toBe("partial");
    expect(doc?.lines.length).toBeGreaterThan(0);
  });

  it("get-document is null for another org's document id", async () => {
    const otherTools = getOrgAgentReadOnlyTools({ organizationId: otherOrgId });
    const leaked = await run<unknown>(otherTools, "get-document", {
      id: invoiceId,
    });
    expect(leaked).toBeNull();
  });
});

describe("wallet read tools (AC-1)", () => {
  it("get-credit-balance returns the store-credit sum for an entity", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const result = await run<{ entityId: string; balance: number }>(
      tools,
      "get-credit-balance",
      { entityId }
    );
    expect(result.entityId).toBe(entityId);
    expect(result.balance).toBe(300);
  });

  it("list-credit-entries returns the wallet ledger", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const entries = await run<Array<{ amount: number; type: string }>>(
      tools,
      "list-credit-entries",
      { entityId }
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.amount).toBe(300);
    expect(entries[0]?.type).toBe("deposit");
  });

  it("wallet reads are blind to other orgs", async () => {
    const otherTools = getOrgAgentReadOnlyTools({ organizationId: otherOrgId });
    const result = await run<{ balance: number }>(
      otherTools,
      "get-credit-balance",
      { entityId }
    );
    expect(result.balance).toBe(0);
  });
});

describe("people/entity + settings read tools (AC-2)", () => {
  it("list-entities returns this org's entities only", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const rows = await run<Array<{ id: string; name: string }>>(
      tools,
      "list-entities",
      {}
    );
    expect(rows.map((e) => e.id)).toEqual([entityId]);
  });

  it("get-entity carries AR balance and credit balance projections", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const entity = await run<{
      id: string;
      balance: number;
      creditBalance: number;
    } | null>(tools, "get-entity", { id: entityId });
    // AR = 1000 − 400 paid = 600; credit = 300; net balance = 600 − 300 = 300.
    expect(entity?.id).toBe(entityId);
    expect(entity?.creditBalance).toBe(300);
    expect(entity?.balance).toBe(300);
  });

  it("get-organization returns the org's own settings", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const org = await run<{ id: string; name: string } | null>(
      tools,
      "get-organization",
      {}
    );
    expect(org?.id).toBe(orgId);
  });

  it("list-activity returns this org's event timeline", async () => {
    const tools = getOrgAgentReadOnlyTools({ organizationId: orgId });
    const rows = await run<Array<{ organizationId: string }>>(
      tools,
      "list-activity",
      {}
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.organizationId).toBe(orgId);
    }
  });
});

describe("no mutation tool is exposed (AC-3)", () => {
  it("the read-only reach has no mutating tool", () => {
    const names = Object.keys(
      getOrgAgentReadOnlyTools({ organizationId: orgId })
    );
    for (const name of names) {
      expect(name).not.toMatch(MUTATING_TOOL_NAME);
    }
  });

  it("the codemode reach's only writes are the autonomous catalog tools", () => {
    // `delete-product` is deliberately NOT here — it is human-approval-gated and
    // exposed top-level (getOrgAgentApprovalTools), never routed through codemode
    // (ALW-348). See tool-approvals.workerd.test.ts.
    const names = Object.keys(
      getOrgAgentTools({
        organizationId: orgId,
        userId: "user_test",
        waitUntil: () => undefined,
      })
    );
    const mutating = names.filter((n) => MUTATING_TOOL_NAME.test(n)).sort();
    expect(mutating).toEqual(["create-product", "update-product"]);
    expect(names).not.toContain("delete-product");
  });
});
