import type { AgentConfig, SkillDefinition } from "@workspace/types/ai";
import type { TypedToolResult } from "ai";
import type { AiToolId } from "@/lib/ai/tools";
import type { LoadSkillResult } from "@/lib/ai/tools/load-skill";
import type { AIUIMessage } from "@/types/ai";
import { skillDefinitions } from "../skills";

export function listSkillsMetadata(): Map<string, SkillDefinition> {
  const skills = new Map<string, SkillDefinition>();

  for (const [skillName, skillDef] of Object.entries(skillDefinitions)) {
    skills.set(skillName, skillDef);
  }

  return skills;
}

export function getSkillDefinition(skillName: string): SkillDefinition | null {
  const skillDef = skillDefinitions[skillName];
  if (!skillDef) {
    console.warn(`[Skills] Requested skill '${skillName}' not found.`);
    return null;
  }

  return skillDef;
}

export function listSkillsForAgent(
  availableSkills: string[]
): Map<string, SkillDefinition> {
  const skills = new Map<string, SkillDefinition>();

  for (const skillName of availableSkills) {
    const skillDef = skillDefinitions[skillName];
    if (skillDef) {
      skills.set(skillName, skillDef);
    }
  }

  return skills;
}

export function formatSkillsForPrompt(availableSkills?: string[]): string {
  const skills = availableSkills
    ? listSkillsForAgent(availableSkills)
    : listSkillsMetadata();

  if (skills.size === 0) {
    return "No skills are currently available.";
  }

  return Array.from(skills.entries())
    .map(([name, skill]) => `- **[${name}]**: ${skill.description}`)
    .join("\n");
}

export function getToolsFromLoadedSkillsInMessages(
  messages: AIUIMessage[]
): Set<AiToolId> {
  const activeTools = new Set<AiToolId>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (
        part.type === "tool-load-skill" &&
        part.state === "output-available" &&
        part.output.definition
      ) {
        for (const tool of part.output.definition.availableTools) {
          activeTools.add(tool as AiToolId);
        }
      }
    }
  }

  return activeTools;
}

export function getToolsFromDefaultSkills(agent: AgentConfig): Set<AiToolId> {
  const activeTools = new Set<AiToolId>();

  for (const skillName of agent.skills.defaultLoaded) {
    const definition = getSkillDefinition(skillName);
    if (definition) {
      for (const tool of definition.availableTools) {
        activeTools.add(tool as AiToolId);
      }
    }
  }

  return activeTools;
}

export function buildInitialActiveTools(
  agent: AgentConfig,
  messages: AIUIMessage[]
): Set<AiToolId> {
  const activeTools = new Set<AiToolId>([
    "load-skill",
    "show-message",
    "run-agent",
    "get-task-result",
    "list-tasks",
  ]);

  const defaultTools = getToolsFromDefaultSkills(agent);
  for (const tool of defaultTools) {
    activeTools.add(tool);
  }

  const historicalTools = getToolsFromLoadedSkillsInMessages(messages);
  for (const tool of historicalTools) {
    activeTools.add(tool);
  }

  return activeTools;
}

export function handleSkillToolResults(
  // biome-ignore lint/suspicious/noExplicitAny: Ok for now, type later
  toolResults: TypedToolResult<any>[],
  currentActiveTools: Set<AiToolId>
): Set<AiToolId> {
  const newActiveTools = new Set(currentActiveTools);
  let changed = false;

  for (const result of toolResults) {
    if (result.toolName === "load-skill") {
      const output = result.output as LoadSkillResult;
      if (output.success !== false && output.definition) {
        for (const tool of output.definition.availableTools) {
          if (!newActiveTools.has(tool as AiToolId)) {
            newActiveTools.add(tool as AiToolId);
            changed = true;
          }
        }
      }
    }
  }

  return changed ? newActiveTools : currentActiveTools;
}
