import { tool } from "ai";
import type { z } from "zod";
import {
  asToolResult,
  type ToolResult,
  toolResultToModelOutput,
} from "./tool-result";

interface OrgToolConfig<TInput, TData> {
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodTypeAny;
  needsApproval?: boolean;
  execute: (input: TInput) => Promise<TData>;
}

/** Thin helper: wraps execute in {@link asToolResult} and maps ToolResult to model output. */
export function defineOrgTool<TInput, TData>(
  config: OrgToolConfig<TInput, TData>
) {
  return tool({
    description: config.description,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    needsApproval: config.needsApproval,
    execute: async (input: TInput) =>
      await asToolResult(() => config.execute(input)),
    toModelOutput: ({ output }) =>
      toolResultToModelOutput(output as ToolResult<TData>),
  });
}
