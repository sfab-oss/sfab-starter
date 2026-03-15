import type { AgentConfig } from "@workspace/types/ai";
import { generalAgent } from "./general-agent";

export const agents = {
  "general-agent": generalAgent,
};

export type AgentId = keyof typeof agents;

export function getAgent(agentId: AgentId): AgentConfig {
  const agent = agents[agentId];
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }
  return agent;
}
