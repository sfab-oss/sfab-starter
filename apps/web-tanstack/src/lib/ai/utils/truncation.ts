import type { Tool } from "ai";

const MAX_OUTPUT_CHARS = 50 * 1024; // 50KB
const MAX_OUTPUT_LINES = 2000;
const TRUNCATION_NOTICE =
  "\n\n[Output was truncated. Use more specific queries to reduce output size.]";

/**
 * Truncate a tool output if it exceeds size limits.
 */
export function truncateToolOutput(output: unknown): unknown {
  const serialized =
    typeof output === "string" ? output : JSON.stringify(output);

  if (serialized.length <= MAX_OUTPUT_CHARS) {
    const lineCount = serialized.split("\n").length;
    if (lineCount <= MAX_OUTPUT_LINES) {
      return output;
    }
  }

  // Truncate by lines first, then by chars
  const lines = serialized.split("\n");
  let truncated: string;
  if (lines.length > MAX_OUTPUT_LINES) {
    truncated = lines.slice(0, MAX_OUTPUT_LINES).join("\n");
  } else {
    truncated = serialized;
  }

  if (truncated.length > MAX_OUTPUT_CHARS) {
    truncated = truncated.slice(0, MAX_OUTPUT_CHARS);
  }

  return truncated + TRUNCATION_NOTICE;
}

/**
 * Wrap all tools' execute functions to truncate oversized outputs.
 */
export function wrapToolsWithTruncation<T extends Record<string, Tool>>(
  tools: T
): T {
  const wrapped = {} as Record<string, Tool>;

  for (const [name, tool] of Object.entries(tools)) {
    if (!tool.execute) {
      wrapped[name] = tool;
      continue;
    }

    const originalExecute = tool.execute;
    wrapped[name] = {
      ...tool,
      execute: async (args: unknown, options: unknown) => {
        const result = await (originalExecute as (...a: unknown[]) => unknown)(
          args,
          options
        );
        return truncateToolOutput(result);
      },
    };
  }

  return wrapped as T;
}
