import {
  createProductSchema,
  updateProductSchema,
} from "@workspace/contract/catalog";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "@workspace/core/catalog";
import { tool } from "ai";
import { z } from "zod";
import type { AgentToolsContext } from "../../types";
import { assertCan } from "../guard";

// Read-only product tools. They need only `organizationId`, so they can be
// composed for surfaces without an acting user (e.g. a delegated sub-agent).
export const createProductReadTools = (
  ctx: Pick<AgentToolsContext, "organizationId">
) => {
  const orgId = ctx.organizationId;
  return {
    "list-products": tool({
      description: "List all catalog products.",
      inputSchema: z.object({}),
      execute: async () => getProducts(orgId),
    }),
    "get-product": tool({
      description: "Get details of a specific product by ID.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => getProduct(id, orgId),
    }),
  };
};

// Autonomous mutating product tools. Every one is RBAC-gated (`assertCan`) but
// applied directly (no human approval) — reversible catalog edits, so they run
// inside codemode. They need the full context including the acting `userId`.
export const createProductWriteTools = (ctx: AgentToolsContext) => {
  const orgId = ctx.organizationId;
  return {
    "create-product": tool({
      description: "Create a new catalog product.",
      inputSchema: createProductSchema,
      execute: async (input) => {
        await assertCan("catalog:write", ctx);
        const result = await createProduct({ ...input, orgId });
        return result[0];
      },
    }),
    "update-product": tool({
      description: "Update an existing product.",
      inputSchema: z.object({
        id: z.string(),
        data: updateProductSchema,
      }),
      execute: async ({ id, data }) => {
        await assertCan("catalog:write", ctx);
        return updateProduct(id, orgId, data);
      },
    }),
  };
};

// Human-approval-gated product tools (ALW-348). `deleteProduct` is destructive
// and hard to reverse, so it opts into the AI-SDK approval flow via
// `needsApproval: true`: the model calls it as a TOP-LEVEL tool (not inside
// codemode), the chat renders an Approve/Reject prompt, and `execute` runs only
// after the human approves. RBAC still guards on top — approval is not
// authorization, so a role that can't `catalog:write` is still refused (post-
// approval) by `assertCan`. See `docs/guides/agent-tool-approvals.md`.
export const createProductApprovalTools = (ctx: AgentToolsContext) => {
  const orgId = ctx.organizationId;
  return {
    "delete-product": tool({
      description: "Delete a product. Requires explicit user approval.",
      inputSchema: z.object({ id: z.string() }),
      needsApproval: true,
      execute: async ({ id }) => {
        await assertCan("catalog:write", ctx);
        return deleteProduct(id, orgId);
      },
    }),
  };
};

// The codemode-bound product reach: reads + autonomous writes. The gated
// `delete-product` is deliberately NOT here — it lives top-level (see
// `createProductApprovalTools`), so it is never routed through codemode.
export const createProductTools = (ctx: AgentToolsContext) => ({
  ...createProductReadTools(ctx),
  ...createProductWriteTools(ctx),
});
