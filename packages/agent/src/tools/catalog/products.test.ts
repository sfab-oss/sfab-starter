import { DomainError } from "@workspace/core/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSION_DENIED_MESSAGE } from "../../constants";
import { createProductReadTools, createProductWriteTools } from "./products";

vi.mock("@workspace/core/catalog", () => ({
  getProduct: vi.fn(),
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  resolveProductRef: vi.fn(),
}));

vi.mock("../guard", () => ({
  assertCan: vi.fn(),
}));

import {
  getProduct,
  resolveProductRef,
  updateProduct,
} from "@workspace/core/catalog";
import { assertCan } from "../guard";

const ctx = {
  organizationId: "org_test",
  userId: "user_test",
  waitUntil: () => undefined,
};

const readOnlyCtx = { organizationId: "org_test" };

interface ExecutableTool {
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

function runTool(
  tool: unknown,
  input: Record<string, unknown>
): Promise<unknown> {
  const executable = tool as ExecutableTool;
  if (!executable.execute) {
    throw new Error("tool has no execute");
  }
  return executable.execute(input);
}

describe("product tools — ToolResult contract", () => {
  beforeEach(() => {
    vi.mocked(assertCan).mockResolvedValue(undefined);
  });

  it("get_product returns ok:true with data on hit", async () => {
    const product = { id: "prod_1", name: "Widget" };
    vi.mocked(getProduct).mockResolvedValue(product as never);

    const tools = createProductReadTools(readOnlyCtx);
    const result = await runTool(tools.get_product, { id: "prod_1" });

    expect(result).toEqual({ ok: true, data: product });
  });

  it("get_product returns not_found without throwing on miss", async () => {
    vi.mocked(getProduct).mockResolvedValue(undefined as never);

    const tools = createProductReadTools(readOnlyCtx);
    const result = await runTool(tools.get_product, { id: "prod_missing" });

    expect(result).toEqual({
      ok: false,
      error: "Product not found: prod_missing",
      code: "not_found",
    });
  });

  it("update_product returns ok:true on success", async () => {
    const product = { id: "prod_1", name: "Widget" };
    const updated = { ...product, name: "Widget Pro" };
    vi.mocked(resolveProductRef).mockResolvedValue(product as never);
    vi.mocked(updateProduct).mockResolvedValue(updated as never);

    const tools = createProductWriteTools(ctx);
    const result = await runTool(tools.update_product, {
      id: "Widget",
      data: { name: "Widget Pro" },
    });

    expect(result).toEqual({ ok: true, data: updated });
  });

  it("update_product returns not_found without throwing on resolve miss", async () => {
    vi.mocked(resolveProductRef).mockRejectedValue(
      new DomainError(
        'Product not found: no match for id, name, or sku "missing"',
        "not_found"
      )
    );

    const tools = createProductWriteTools(ctx);
    const result = await runTool(tools.update_product, {
      id: "missing",
      data: { name: "Nope" },
    });

    expect(result).toEqual({
      ok: false,
      error: 'Product not found: no match for id, name, or sku "missing"',
      code: "not_found",
    });
  });

  it("update_product returns forbidden without throwing on RBAC deny", async () => {
    vi.mocked(assertCan).mockRejectedValue(
      new Error(PERMISSION_DENIED_MESSAGE)
    );

    const tools = createProductWriteTools(ctx);
    const result = await runTool(tools.update_product, {
      id: "prod_1",
      data: { name: "Nope" },
    });

    expect(result).toEqual({
      ok: false,
      error: PERMISSION_DENIED_MESSAGE,
      code: "forbidden",
    });
  });
});
