import type { QueryClient } from "@tanstack/react-query";
import { AGENT_WRITE_TOOL_NAMES } from "@workspace/agent/constants";
import { getProductKey, getProductsKey } from "@/hooks/use-products";

export interface AgentAppliedWrite {
  method: string;
  args: unknown;
}

/**
 * Mutating org-agent tools that should refresh React Query after a successful
 * apply. Read-only tools (`list_*`, `get_*`, `display_*`, `delegate`) must never
 * appear here (AC-4).
 */
export interface AgentToolInvalidationEntry {
  invalidate: (queryClient: QueryClient, args: unknown) => void;
}

function idFromArgs(args: unknown): string | undefined {
  if (!args || typeof args !== "object") {
    return;
  }
  const id = (args as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export const AGENT_TOOL_INVALIDATION_REGISTRY: Record<
  string,
  AgentToolInvalidationEntry
> = {
  create_product: {
    invalidate: (queryClient) => {
      queryClient.invalidateQueries({ queryKey: getProductsKey() });
    },
  },
  update_product: {
    invalidate: (queryClient, args) => {
      queryClient.invalidateQueries({ queryKey: getProductsKey() });
      const id = idFromArgs(args);
      if (id) {
        queryClient.invalidateQueries({ queryKey: getProductKey(id) });
      }
    },
  },
  delete_product: {
    invalidate: (queryClient, args) => {
      queryClient.invalidateQueries({ queryKey: getProductsKey() });
      const id = idFromArgs(args);
      if (id) {
        queryClient.invalidateQueries({ queryKey: getProductKey(id) });
      }
    },
  },
};

/** Registry keys must stay aligned with `@workspace/agent` write-tool names. */
const registryKeys = new Set(Object.keys(AGENT_TOOL_INVALIDATION_REGISTRY));
for (const name of AGENT_WRITE_TOOL_NAMES) {
  if (!registryKeys.has(name)) {
    throw new Error(
      `AGENT_TOOL_INVALIDATION_REGISTRY missing write tool "${name}"`
    );
  }
}

export function invalidateForAgentWrite(
  queryClient: QueryClient,
  write: AgentAppliedWrite
): boolean {
  const entry = AGENT_TOOL_INVALIDATION_REGISTRY[write.method];
  if (!entry) {
    return false;
  }
  entry.invalidate(queryClient, write.args);
  return true;
}
