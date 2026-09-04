import { tool } from "ai";
import type { z } from "zod";
import type { ToolContext } from "../tool-parts/context";
import {
  asToolResult,
  type ToolResult,
  toolResultToModelOutput,
} from "../tools/tool-result";

export interface InAppToolPieces<Schema extends z.ZodType = z.ZodType> {
  description: string;
  execute: (ctx: ToolContext, input: z.infer<Schema>) => Promise<unknown>;
  inputSchema: Schema;
  name: string;
  needsApproval?: boolean;
  outputSchema?: z.ZodTypeAny;
}

export function inAppTool(toolCtx: ToolContext) {
  return function bindInAppTool<Schema extends z.ZodType>(
    pieces: InAppToolPieces<Schema>
  ) {
    return tool({
      description: pieces.description,
      inputSchema: pieces.inputSchema,
      outputSchema: pieces.outputSchema,
      needsApproval: pieces.needsApproval,
      execute: async (input: z.infer<Schema>) =>
        await asToolResult(() => pieces.execute(toolCtx, input)),
      toModelOutput: ({ output }) =>
        toolResultToModelOutput(output as ToolResult<unknown>),
    });
  };
}
