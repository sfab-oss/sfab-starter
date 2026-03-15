import type { AgentConfig, SkillDefinition } from "@workspace/types/ai";
import { describe, expect, it } from "vitest";
import {
  buildInitialActiveTools,
  formatSkillsForPrompt,
  getSkillDefinition,
  getToolsFromDefaultSkills,
  getToolsFromLoadedSkillsInMessages,
  handleSkillToolResults,
  listSkillsForAgent,
  listSkillsMetadata,
} from "../../src/lib/ai/skills/skill-service";
import type { AIUIMessage } from "../../src/types/ai";

// ---------- helpers ----------

/** Minimal agent config for testing */
function makeAgent(
  overrides: Partial<AgentConfig> & {
    skills: AgentConfig["skills"];
  }
): AgentConfig {
  return {
    id: overrides.id ?? "test-agent",
    name: overrides.name ?? "Test Agent",
    description: overrides.description ?? "A test agent",
    systemPrompt: overrides.systemPrompt ?? (() => "prompt"),
    model: overrides.model ?? { modelId: "test-model" },
    skills: overrides.skills,
  };
}

/**
 * Build a message with a successful `tool-load-skill` part.
 * Mirrors what the AI SDK produces after a load-skill tool call completes.
 */
function makeMessageWithLoadedSkill(skill: SkillDefinition): AIUIMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [
      {
        type: "tool-load-skill",
        state: "output-available",
        toolCallId: `call-${crypto.randomUUID()}`,
        toolName: "load-skill",
        args: { name: skill.name },
        output: {
          success: true,
          definition: skill,
        },
      } as unknown as AIUIMessage["parts"][number],
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      status: "success",
    },
  } as AIUIMessage;
}

function makeTextMessage(text: string): AIUIMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text }],
    metadata: {
      createdAt: new Date().toISOString(),
      status: "success",
    },
  } as AIUIMessage;
}

// ---------- tests ----------

describe("listSkillsMetadata", () => {
  it("returns all registered skills", () => {
    const skills = listSkillsMetadata();

    expect(skills.size).toBeGreaterThanOrEqual(3);
    expect(skills.has("product-manager")).toBe(true);
    expect(skills.has("warehouse-manager")).toBe(true);
    expect(skills.has("stock-movement-manager")).toBe(true);
  });

  it("each skill has required fields", () => {
    const skills = listSkillsMetadata();

    for (const [name, skill] of skills) {
      expect(skill.name).toBe(name);
      expect(skill.description).toBeTruthy();
      expect(skill.content).toBeTruthy();
      expect(skill.availableTools.length).toBeGreaterThan(0);
    }
  });
});

describe("getSkillDefinition", () => {
  it("returns a skill for a valid name", () => {
    const skill = getSkillDefinition("product-manager");

    expect(skill).not.toBeNull();
    expect(skill?.name).toBe("product-manager");
    expect(skill?.availableTools).toContain("list-products");
  });

  it("returns null for an invalid name", () => {
    const skill = getSkillDefinition("does-not-exist");
    expect(skill).toBeNull();
  });
});

describe("listSkillsForAgent", () => {
  it("returns only the specified skills", () => {
    const skills = listSkillsForAgent(["product-manager"]);

    expect(skills.size).toBe(1);
    expect(skills.has("product-manager")).toBe(true);
    expect(skills.has("warehouse-manager")).toBe(false);
  });

  it("ignores skill names that do not exist", () => {
    const skills = listSkillsForAgent([
      "product-manager",
      "non-existent-skill",
    ]);

    expect(skills.size).toBe(1);
    expect(skills.has("product-manager")).toBe(true);
  });

  it("returns empty map for empty input", () => {
    const skills = listSkillsForAgent([]);
    expect(skills.size).toBe(0);
  });
});

describe("formatSkillsForPrompt", () => {
  it("formats skills as markdown bullet points", () => {
    const formatted = formatSkillsForPrompt(["product-manager"]);

    expect(formatted).toContain("**[product-manager]**");
    expect(formatted).toContain("Manage the product catalog");
  });

  it("formats multiple skills", () => {
    const formatted = formatSkillsForPrompt([
      "product-manager",
      "warehouse-manager",
    ]);
    const lines = formatted.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^- \*\*\[product-manager\]\*\*/);
    expect(lines[1]).toMatch(/^- \*\*\[warehouse-manager\]\*\*/);
  });

  it("returns fallback text when no skills available", () => {
    const formatted = formatSkillsForPrompt([]);
    expect(formatted).toBe("No skills are currently available.");
  });

  it("returns all skills when called without arguments", () => {
    const formatted = formatSkillsForPrompt();

    expect(formatted).toContain("product-manager");
    expect(formatted).toContain("warehouse-manager");
    expect(formatted).toContain("stock-movement-manager");
  });
});

describe("getToolsFromLoadedSkillsInMessages", () => {
  it("returns empty set for no messages", () => {
    const tools = getToolsFromLoadedSkillsInMessages([]);
    expect(tools.size).toBe(0);
  });

  it("returns empty set for messages without skill loads", () => {
    const tools = getToolsFromLoadedSkillsInMessages([
      makeTextMessage("Hello"),
    ]);
    expect(tools.size).toBe(0);
  });

  it("extracts tools from a loaded skill part", () => {
    const skill = getSkillDefinition("product-manager")!;
    const msg = makeMessageWithLoadedSkill(skill);

    const tools = getToolsFromLoadedSkillsInMessages([msg]);

    for (const toolId of skill.availableTools) {
      expect(tools.has(toolId as never)).toBe(true);
    }
  });

  it("merges tools from multiple loaded skills across messages", () => {
    const productSkill = getSkillDefinition("product-manager")!;
    const warehouseSkill = getSkillDefinition("warehouse-manager")!;

    const tools = getToolsFromLoadedSkillsInMessages([
      makeMessageWithLoadedSkill(productSkill),
      makeTextMessage("some text between"),
      makeMessageWithLoadedSkill(warehouseSkill),
    ]);

    for (const toolId of productSkill.availableTools) {
      expect(tools.has(toolId as never)).toBe(true);
    }
    for (const toolId of warehouseSkill.availableTools) {
      expect(tools.has(toolId as never)).toBe(true);
    }
  });

  it("ignores failed load-skill parts", () => {
    const msg = {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [
        {
          type: "tool-load-skill",
          state: "output-available",
          toolCallId: "call-1",
          toolName: "load-skill",
          args: { name: "non-existent" },
          output: {
            success: false,
            error: "Skill 'non-existent' not found.",
          },
        } as unknown as AIUIMessage["parts"][number],
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        status: "success",
      },
    } as AIUIMessage;

    const tools = getToolsFromLoadedSkillsInMessages([msg]);
    expect(tools.size).toBe(0);
  });

  it("ignores in-progress skill parts (state !== output-available)", () => {
    const msg = {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [
        {
          type: "tool-load-skill",
          state: "partial-call",
          toolCallId: "call-1",
          toolName: "load-skill",
          args: { name: "product-manager" },
        } as unknown as AIUIMessage["parts"][number],
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        status: "success",
      },
    } as AIUIMessage;

    const tools = getToolsFromLoadedSkillsInMessages([msg]);
    expect(tools.size).toBe(0);
  });

  it("does not produce duplicates when same skill loaded twice", () => {
    const skill = getSkillDefinition("product-manager")!;
    const tools = getToolsFromLoadedSkillsInMessages([
      makeMessageWithLoadedSkill(skill),
      makeMessageWithLoadedSkill(skill),
    ]);

    // Set inherently deduplicates, but verify count matches the skill's tools
    expect(tools.size).toBe(skill.availableTools.length);
  });
});

describe("getToolsFromDefaultSkills", () => {
  it("returns empty set when agent has no default skills", () => {
    const agent = makeAgent({
      skills: { defaultLoaded: [], availableCalled: [] },
    });

    const tools = getToolsFromDefaultSkills(agent);
    expect(tools.size).toBe(0);
  });

  it("returns tools from default-loaded skills", () => {
    const agent = makeAgent({
      skills: {
        defaultLoaded: ["product-manager"],
        availableCalled: [],
      },
    });

    const tools = getToolsFromDefaultSkills(agent);

    expect(tools.has("list-products")).toBe(true);
    expect(tools.has("create-product")).toBe(true);
  });

  it("skips non-existent default skills", () => {
    const agent = makeAgent({
      skills: {
        defaultLoaded: ["product-manager", "non-existent"],
        availableCalled: [],
      },
    });

    const tools = getToolsFromDefaultSkills(agent);

    // Should still have product tools, and not throw
    expect(tools.has("list-products")).toBe(true);
  });
});

describe("buildInitialActiveTools", () => {
  it("always includes load-skill and show-message", () => {
    const agent = makeAgent({
      skills: { defaultLoaded: [], availableCalled: [] },
    });

    const tools = buildInitialActiveTools(agent, []);

    expect(tools.has("load-skill")).toBe(true);
    expect(tools.has("show-message")).toBe(true);
  });

  it("includes default-loaded skill tools", () => {
    const agent = makeAgent({
      skills: {
        defaultLoaded: ["warehouse-manager"],
        availableCalled: [],
      },
    });

    const tools = buildInitialActiveTools(agent, []);

    expect(tools.has("load-skill")).toBe(true);
    expect(tools.has("show-message")).toBe(true);
    expect(tools.has("list-warehouses")).toBe(true);
    expect(tools.has("create-warehouse")).toBe(true);
  });

  it("includes tools from previously loaded skills in messages", () => {
    const agent = makeAgent({
      skills: { defaultLoaded: [], availableCalled: [] },
    });

    const productSkill = getSkillDefinition("product-manager")!;
    const messages = [makeMessageWithLoadedSkill(productSkill)];

    const tools = buildInitialActiveTools(agent, messages);

    expect(tools.has("load-skill")).toBe(true);
    expect(tools.has("show-message")).toBe(true);
    expect(tools.has("list-products")).toBe(true);
    expect(tools.has("create-product")).toBe(true);
  });

  it("combines default and historical tools without duplicates", () => {
    const agent = makeAgent({
      skills: {
        defaultLoaded: ["product-manager"],
        availableCalled: [],
      },
    });

    const productSkill = getSkillDefinition("product-manager")!;
    const warehouseSkill = getSkillDefinition("warehouse-manager")!;

    const messages = [
      makeMessageWithLoadedSkill(productSkill), // overlaps with defaultLoaded
      makeMessageWithLoadedSkill(warehouseSkill),
    ];

    const tools = buildInitialActiveTools(agent, messages);

    // System tools
    expect(tools.has("load-skill")).toBe(true);
    expect(tools.has("show-message")).toBe(true);
    // Product tools (from both default and history)
    expect(tools.has("list-products")).toBe(true);
    // Warehouse tools (from history only)
    expect(tools.has("list-warehouses")).toBe(true);
  });
});

describe("handleSkillToolResults", () => {
  it("adds new tools from a successful load-skill result", () => {
    const currentTools = new Set(["load-skill", "show-message"] as const);
    const productSkill = getSkillDefinition("product-manager")!;

    const newTools = handleSkillToolResults(
      [
        {
          toolName: "load-skill",
          toolCallId: "call-1",
          args: { name: "product-manager" },
          output: { success: true, definition: productSkill },
        },
      ],
      currentTools as never
    );

    expect(newTools.has("list-products" as never)).toBe(true);
    expect(newTools.has("create-product" as never)).toBe(true);
    // Should be a new set since it changed
    expect(newTools).not.toBe(currentTools);
  });

  it("returns the same set reference when no new tools are added", () => {
    const productSkill = getSkillDefinition("product-manager")!;
    const currentTools = new Set([
      "load-skill",
      "show-message",
      ...productSkill.availableTools,
    ]);

    const newTools = handleSkillToolResults(
      [
        {
          toolName: "load-skill",
          toolCallId: "call-1",
          args: { name: "product-manager" },
          output: { success: true, definition: productSkill },
        },
      ],
      currentTools as never
    );

    // Same reference = no change detected
    expect(newTools).toBe(currentTools);
  });

  it("ignores failed load-skill results", () => {
    const currentTools = new Set(["load-skill", "show-message"] as const);

    const newTools = handleSkillToolResults(
      [
        {
          toolName: "load-skill",
          toolCallId: "call-1",
          args: { name: "non-existent" },
          output: {
            success: false,
            error: "Skill 'non-existent' not found.",
          },
        },
      ],
      currentTools as never
    );

    // Same reference = no change
    expect(newTools).toBe(currentTools);
  });

  it("ignores non-load-skill tool results", () => {
    const currentTools = new Set(["load-skill", "show-message"] as const);

    const newTools = handleSkillToolResults(
      [
        {
          toolName: "list-products",
          toolCallId: "call-1",
          args: {},
          output: { success: true, data: [] },
        },
      ],
      currentTools as never
    );

    expect(newTools).toBe(currentTools);
  });

  it("handles multiple tool results in one call", () => {
    const currentTools = new Set(["load-skill", "show-message"] as const);
    const productSkill = getSkillDefinition("product-manager")!;
    const warehouseSkill = getSkillDefinition("warehouse-manager")!;

    const newTools = handleSkillToolResults(
      [
        {
          toolName: "load-skill",
          toolCallId: "call-1",
          args: { name: "product-manager" },
          output: { success: true, definition: productSkill },
        },
        {
          toolName: "load-skill",
          toolCallId: "call-2",
          args: { name: "warehouse-manager" },
          output: { success: true, definition: warehouseSkill },
        },
      ],
      currentTools as never
    );

    expect(newTools.has("list-products" as never)).toBe(true);
    expect(newTools.has("list-warehouses" as never)).toBe(true);
  });
});
