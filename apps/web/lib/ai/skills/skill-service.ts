import type { AgentConfig, SkillDefinition } from "@workspace/types/ai";
import type { TypedToolResult } from "ai";
import type { AIUIMessage } from "@/types/ai";
import type { LoadSkillResult } from "../tools/(registry)/load-skill";
import type { aiToolId } from "../tools/registry";
import { skillDefinitions } from "./registry/index";

/**
 * Lists all available skills.
 * @returns A Map of skillName -> SkillDefinition.
 */
export function listSkillsMetadata(): Map<string, SkillDefinition> {
  const skills = new Map<string, SkillDefinition>();

  for (const [skillName, skillDef] of Object.entries(skillDefinitions)) {
    skills.set(skillName, skillDef);
  }

  return skills;
}

/**
 * Loads the full content of a specific skill.
 * @param skillName The name of the skill to load.
 * @returns A Promise resolving to the skill's content, or null if not found.
 */
export function getSkillDefinition(skillName: string): SkillDefinition | null {
  const skillDef = skillDefinitions[skillName];
  if (!skillDef) {
    console.warn(`[Skills] Requested skill '${skillName}' not found.`);
    return null;
  }

  return skillDef;
}

/**
 * Lists skills filtered by a list of available skill names.
 * @param availableSkills List of skill names available for the agent.
 * @returns A Map of skillName -> SkillDefinition for the available skills.
 */
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

/**
 * Formats the available skills into a string suitable for the system prompt.
 * @param availableSkills Optional list of skill names to include. If not provided, all skills are listed.
 * @returns A formatted string listing skills, e.g., "- [notes-manager]: Manage personal notes."
 */
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

/**
 * Scans message history for previously loaded skills and returns their tools.
 */
export function getToolsFromLoadedSkillsInMessages(
  messages: AIUIMessage[]
): Set<aiToolId> {
  const activeTools = new Set<aiToolId>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (
        part.type === "tool-load-skill" &&
        part.state === "output-available" &&
        part.output.definition
      ) {
        for (const tool of part.output.definition.availableTools) {
          activeTools.add(tool as aiToolId);
        }
      }
    }
  }

  return activeTools;
}

/**
 * Loads default skills for an agent and returns their tools.
 */
export function getToolsFromDefaultSkills(agent: AgentConfig): Set<aiToolId> {
  const activeTools = new Set<aiToolId>();

  for (const skillName of agent.skills.defaultLoaded) {
    const definition = getSkillDefinition(skillName);
    if (definition) {
      for (const tool of definition.availableTools) {
        activeTools.add(tool as aiToolId);
      }
    }
  }

  return activeTools;
}

/**
 * Builds the initial set of active tools for an agent response.
 */
export function buildInitialActiveTools(
  agent: AgentConfig,
  messages: AIUIMessage[]
): Set<aiToolId> {
  // Always include core tools
  const activeTools = new Set<aiToolId>(["load-skill", "show-message"]);

  // Add tools from default skills
  const defaultTools = getToolsFromDefaultSkills(agent);
  for (const tool of defaultTools) {
    activeTools.add(tool);
  }

  // Add tools from skills loaded in the past (messages)
  const historicalTools = getToolsFromLoadedSkillsInMessages(messages);
  for (const tool of historicalTools) {
    activeTools.add(tool);
  }

  return activeTools;
}

/**
 * Processes tool results and returns newly activated tools if a skill was loaded.
 */
export function handleSkillToolResults(
  // biome-ignore lint/suspicious/noExplicitAny: Ok for now, type later
  toolResults: TypedToolResult<any>[],
  currentActiveTools: Set<aiToolId>
): Set<aiToolId> {
  const newActiveTools = new Set(currentActiveTools);
  let changed = false;

  for (const result of toolResults) {
    if (result.toolName === "load-skill") {
      const output = result.output as LoadSkillResult;
      if (output.success !== false && output.definition) {
        for (const tool of output.definition.availableTools) {
          if (!newActiveTools.has(tool as aiToolId)) {
            newActiveTools.add(tool as aiToolId);
            changed = true;
          }
        }
      }
    }
  }

  return changed ? newActiveTools : currentActiveTools;
}
