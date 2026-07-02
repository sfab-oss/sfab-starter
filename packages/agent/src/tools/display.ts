import { type ToolSet, tool } from "ai";
import { z } from "zod";
import { DISPLAY_TOOL_NAMES } from "../constants";
import type { AgentToolsContext } from "../types";

const DISPLAY_NO_DUPLICATE =
  " The UI renders the data — do not repeat it in your reply (no tables or lists).";

export const createDisplayTools = (_ctx: AgentToolsContext): ToolSet => ({
  [DISPLAY_TOOL_NAMES.PRODUCT_LIST]: tool({
    description: `Show products as an inline list in the chat. Pass product IDs from codemode.${DISPLAY_NO_DUPLICATE}`,
    inputSchema: z.object({
      productIds: z.array(z.string()).describe("Product IDs to display."),
    }),
    execute: async ({ productIds }) => ({ productIds }),
  }),
  [DISPLAY_TOOL_NAMES.MEMORY]: tool({
    description:
      "Show the organization's shared memory as an inline card. Use when the user asks what you remember about the organization.",
    inputSchema: z.object({}),
    execute: async () => ({}),
  }),
});
