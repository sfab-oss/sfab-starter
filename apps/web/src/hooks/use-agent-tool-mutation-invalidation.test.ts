import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { OrgChatMessage } from "@/components/chat/dock/chat-tabs-store";
import {
  applyCodemodeCompletionInvalidations,
  collectCodemodeCompletionEvents,
  collectCodemodePausedWrites,
  resolveCodemodeWrites,
} from "@/hooks/use-agent-tool-mutation-invalidation";
import { invalidateForAgentWrite } from "@/lib/agent-tool-invalidation-registry";
import { asCodemodeOutput } from "@/lib/codemode-output";

function assistantWithCodemode(
  output: unknown,
  toolCallId = "tc_1"
): OrgChatMessage {
  return {
    id: "m1",
    role: "assistant",
    parts: [
      {
        type: "tool-codemode",
        toolCallId,
        state: "output-available",
        input: { code: "await tools.update_product(...)" },
        output,
      },
    ],
  } as OrgChatMessage;
}

describe("asCodemodeOutput", () => {
  it("parses completed output", () => {
    expect(
      asCodemodeOutput({ status: "completed", executionId: "ex_1", result: 1 })
    ).toEqual({ status: "completed", executionId: "ex_1", result: 1 });
  });

  it("rejects non-codemode payloads", () => {
    expect(asCodemodeOutput({ status: "ok" })).toBeNull();
    expect(asCodemodeOutput(null)).toBeNull();
  });
});

describe("resolveCodemodeWrites", () => {
  it("prefers appliedWrites over pending and paused cache", () => {
    const output = asCodemodeOutput({
      status: "completed",
      executionId: "ex_1",
      appliedWrites: [
        { method: "update_product", args: { id: "p1", data: { name: "X" } } },
      ],
      pending: [{ method: "delete_product", args: { id: "p9" } }],
    });
    if (output == null) {
      throw new Error("expected codemode output");
    }
    expect(
      resolveCodemodeWrites(
        output,
        "tc_1",
        new Map([["tc_1", [{ method: "delete_product", args: { id: "p2" } }]]])
      )
    ).toEqual([
      { method: "update_product", args: { id: "p1", data: { name: "X" } } },
    ]);
  });

  it("falls back to pending then paused cache", () => {
    const output = asCodemodeOutput({
      status: "completed",
      executionId: "ex_2",
      pending: [{ method: "delete_product", args: { id: "p9" } }],
    });
    if (output == null) {
      throw new Error("expected codemode output");
    }
    expect(resolveCodemodeWrites(output, "tc_1", new Map())).toEqual([
      { method: "delete_product", args: { id: "p9" } },
    ]);

    const empty = asCodemodeOutput({
      status: "completed",
      executionId: "ex_3",
    });
    if (empty == null) {
      throw new Error("expected codemode output");
    }
    expect(
      resolveCodemodeWrites(
        empty,
        "tc_del",
        new Map([
          ["tc_del", [{ method: "delete_product", args: { id: "p2" } }]],
        ])
      )
    ).toEqual([{ method: "delete_product", args: { id: "p2" } }]);
  });
});

describe("collectCodemodeCompletionEvents", () => {
  it("emits completed codemode toolCallIds once", () => {
    const messages = [
      assistantWithCodemode({
        status: "completed",
        executionId: "ex_1",
        result: { ok: true },
      }),
    ];
    const first = collectCodemodeCompletionEvents(messages, new Set());
    expect(first).toEqual([
      {
        toolCallId: "tc_1",
        writes: [],
      },
    ]);
    const second = collectCodemodeCompletionEvents(messages, new Set(["tc_1"]));
    expect(second).toEqual([]);
  });

  it("ignores paused / read-only / non-codemode parts", () => {
    const messages: OrgChatMessage[] = [
      assistantWithCodemode({
        status: "paused",
        executionId: "ex_2",
        pending: [{ method: "delete_product", args: { id: "p1" } }],
      }),
      {
        id: "m2",
        role: "assistant",
        parts: [
          {
            type: "tool-delegate",
            toolCallId: "tc_d",
            state: "output-available",
            input: { task: "research" },
            output: { summary: "done" },
          },
        ],
      } as OrgChatMessage,
    ];
    expect(collectCodemodeCompletionEvents(messages, new Set())).toEqual([]);
  });

  it("includes appliedWrites from completed output", () => {
    const messages = [
      assistantWithCodemode({
        status: "completed",
        executionId: "ex_3",
        appliedWrites: [
          {
            method: "update_product",
            args: { id: "prod_1", data: { name: "Fresh" } },
          },
        ],
      }),
    ];
    expect(collectCodemodeCompletionEvents(messages, new Set())).toEqual([
      {
        toolCallId: "tc_1",
        writes: [
          {
            method: "update_product",
            args: { id: "prod_1", data: { name: "Fresh" } },
          },
        ],
      },
    ]);
  });

  it("does not treat list_/get_ pending methods as writes", () => {
    const messages = [
      assistantWithCodemode({
        status: "completed",
        executionId: "ex_4",
        pending: [{ method: "list_products", args: {} }],
      }),
    ];
    expect(
      collectCodemodeCompletionEvents(messages, new Set())[0]?.writes
    ).toEqual([]);
  });
});

describe("collectCodemodePausedWrites", () => {
  it("caches delete_product from paused pending", () => {
    const messages = [
      assistantWithCodemode({
        status: "paused",
        executionId: "ex_5",
        pending: [{ method: "delete_product", args: { id: "p2" } }],
      }),
    ];
    const map = collectCodemodePausedWrites(messages);
    expect(map.get("tc_1")).toEqual([
      { method: "delete_product", args: { id: "p2" } },
    ]);
  });
});

describe("invalidateForAgentWrite", () => {
  it("create invalidates list prefix only", () => {
    const queryClient = {
      invalidateQueries: vi.fn(),
    } as unknown as QueryClient;
    expect(
      invalidateForAgentWrite(queryClient, {
        method: "create_product",
        args: { name: "X" },
      })
    ).toBe(true);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["products"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("update invalidates list + detail", () => {
    const queryClient = {
      invalidateQueries: vi.fn(),
    } as unknown as QueryClient;
    invalidateForAgentWrite(queryClient, {
      method: "update_product",
      args: { id: "prod_1", data: { name: "Y" } },
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["products"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["products", "prod_1"],
    });
  });

  it("ignores read-only tool names (AC-4)", () => {
    const queryClient = {
      invalidateQueries: vi.fn(),
    } as unknown as QueryClient;
    expect(
      invalidateForAgentWrite(queryClient, {
        method: "list_products",
        args: {},
      })
    ).toBe(false);
    expect(
      invalidateForAgentWrite(queryClient, {
        method: "get_product",
        args: { id: "x" },
      })
    ).toBe(false);
    expect(
      invalidateForAgentWrite(queryClient, {
        method: "display_product_list",
        args: {},
      })
    ).toBe(false);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});

describe("applyCodemodeCompletionInvalidations", () => {
  it("invalidates for update_product from appliedWrites", () => {
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    applyCodemodeCompletionInvalidations({
      events: [
        {
          toolCallId: "tc_update",
          writes: [
            {
              method: "update_product",
              args: { id: "seed-prod-widget", data: { name: "ALW500-QA" } },
            },
          ],
        },
      ],
      queryClient,
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["products"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["products", "seed-prod-widget"],
    });
  });

  it("invalidates for create_product", () => {
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    applyCodemodeCompletionInvalidations({
      events: [
        {
          toolCallId: "tc_create",
          writes: [
            {
              method: "create_product",
              args: { name: "New", sku: "N-1", price: 1 },
            },
          ],
        },
      ],
      queryClient,
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["products"],
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("dedupes by toolCallId via handled set", () => {
    const handled = new Set<string>();
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    const events = [
      {
        toolCallId: "tc_once",
        writes: [
          {
            method: "create_product",
            args: { name: "A", sku: "A-1", price: 1 },
          },
        ],
      },
    ];

    applyCodemodeCompletionInvalidations({
      events,
      handled,
      queryClient,
    });
    applyCodemodeCompletionInvalidations({
      events,
      handled,
      queryClient,
    });

    expect(handled.has("tc_once")).toBe(true);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });
});
