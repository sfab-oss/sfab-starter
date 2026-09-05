"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";

const mcpMineKey = ["mcp", "connections", "mine"] as const;
const mcpOrgKey = ["mcp", "connections", "org"] as const;

export function useMcpMineConnections(enabled: boolean) {
  return useQuery({
    queryKey: mcpMineKey,
    enabled,
    queryFn: async () => {
      const res = await client.protected.mcp.connections.mine.$get();
      if (!res.ok) {
        throw new Error("Failed to load MCP connections");
      }
      const body = await res.json();
      return body.items;
    },
  });
}

export function useMcpOrgConnections(enabled: boolean) {
  return useQuery({
    queryKey: mcpOrgKey,
    enabled,
    queryFn: async () => {
      const res = await client.protected.mcp.connections.org.$get();
      if (!res.ok) {
        throw new Error("Failed to load org MCP connections");
      }
      const body = await res.json();
      return body.items;
    },
  });
}

export function useRevokeMcpConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { clientId: string; userId: string }) => {
      const res = await client.protected.mcp.connections.revoke.$post({
        json: params,
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to revoke");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "connections"] });
    },
  });
}
