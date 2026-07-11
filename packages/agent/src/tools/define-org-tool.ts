import { tool } from "ai";
import type { z } from "zod";
import {
  asToolResult,
  asToolResultFound,
  type ToolResult,
  toolResultToModelOutput,
} from "./tool-result";

interface OrgToolConfig<TInput, TData> {
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodTypeAny;
  needsApproval?: boolean;
  /** When true, null/undefined from execute becomes a not_found ToolResult. */
  requireData?: boolean;
  notFoundMessage?: string | ((input: TInput) => string);
  execute: (input: TInput) => Promise<TData | null | undefined>;
}

/** Thin helper: wraps execute in {@link asToolResult} and maps ToolResult to model output. */
export function defineOrgTool<TInput, TData>(
  config: OrgToolConfig<TInput, TData>
) {
  const { requireData = false, notFoundMessage = "Not found" } = config;
  return tool({
    description: config.description,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    needsApproval: config.needsApproval,
    execute: async (input: TInput) => {
      if (requireData) {
        const message =
          typeof notFoundMessage === "function"
            ? notFoundMessage(input)
            : notFoundMessage;
        return await asToolResultFound(() => config.execute(input), message);
      }
      return await asToolResult(() => config.execute(input) as Promise<TData>);
    },
    toModelOutput: ({ output }) =>
      toolResultToModelOutput(output as ToolResult<TData>),
  });
}
