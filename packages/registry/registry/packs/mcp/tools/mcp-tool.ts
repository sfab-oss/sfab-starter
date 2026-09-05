import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ToolContext } from "../tool-parts/context";
import { asToolResult } from "../tools/tool-result";

export function toMcpInputSchema(
  schema: z.ZodType
): z.ZodObject<z.ZodRawShape> {
  if (schema instanceof z.ZodObject) {
    return schema as z.ZodObject<z.ZodRawShape>;
  }
  const def = schema as z.ZodType & {
    _def?: { schema?: z.ZodType; innerType?: z.ZodType };
  };
  const inner = def._def?.schema ?? def._def?.innerType;
  if (inner instanceof z.ZodObject) {
    return inner as z.ZodObject<z.ZodRawShape>;
  }
  throw new Error(
    `MCP adapter: inputSchema is not a ZodObject (got ${schema.constructor.name})`
  );
}

export function mcpToolContext(
  grant: { organizationId: string; userId: string },
  executionCtx: ExecutionContext
): ToolContext {
  return {
    organizationId: grant.organizationId,
    userId: grant.userId,
    waitUntil: (p) => executionCtx.waitUntil(p),
  };
}

function asStructuredContent(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { result: value };
}

export function mcpTool(server: McpServer, toolCtx: ToolContext) {
  return function registerMcpTool<Schema extends z.ZodType>(pieces: {
    description: string;
    execute: (ctx: ToolContext, input: z.infer<Schema>) => Promise<unknown>;
    inputSchema: Schema;
    name: string;
  }): void {
    server.registerTool(
      pieces.name,
      {
        description: pieces.description,
        inputSchema: toMcpInputSchema(pieces.inputSchema),
      },
      async (input: unknown) => {
        const result = await asToolResult(() =>
          pieces.execute(toolCtx, input as z.infer<Schema>)
        );
        const structured = asStructuredContent(result);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
          structuredContent: structured,
        };
      }
    );
  };
}
