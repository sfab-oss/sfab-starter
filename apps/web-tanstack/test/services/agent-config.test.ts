import { describe, expect, it } from "vitest";
import { generalAgent } from "../../src/lib/ai/agents/general-agent";
import { getSkillDefinition } from "../../src/lib/ai/utils/skill-service";

describe("generalAgent config", () => {
  it("has required identity fields", () => {
    expect(generalAgent.id).toBe("general-agent");
    expect(generalAgent.name).toBeTruthy();
    expect(generalAgent.description).toBeTruthy();
  });

  it("specifies a model", () => {
    expect(generalAgent.model.modelId).toBeTruthy();
  });

  it("lists available skills", () => {
    expect(generalAgent.skills.availableCalled.length).toBeGreaterThan(0);
    expect(generalAgent.skills.availableCalled).toContain("product-manager");
    expect(generalAgent.skills.availableCalled).toContain("warehouse-manager");
    expect(generalAgent.skills.availableCalled).toContain(
      "stock-movement-manager"
    );
  });

  it("all referenced skills exist in the registry", () => {
    const allSkillNames = [
      ...generalAgent.skills.availableCalled,
      ...generalAgent.skills.defaultLoaded,
    ];

    for (const name of allSkillNames) {
      expect(
        getSkillDefinition(name),
        `Skill "${name}" is referenced by general-agent but not registered`
      ).not.toBeNull();
    }
  });
});

describe("generalAgent.systemPrompt", () => {
  const context = {
    route: { pathname: "/dashboard", params: {} },
    page: { title: "Dashboard" },
  };

  it("includes identity section", () => {
    const prompt = generalAgent.systemPrompt(context, []);
    expect(prompt).toContain("<identity>");
    expect(prompt).toContain("Clippy");
  });

  it("injects personality into system prompt", () => {
    const prompt = generalAgent.systemPrompt(context, []);
    expect(generalAgent.personality).toBeTruthy();
    expect(prompt).toContain(generalAgent.personality);
  });

  it("includes skill protocol", () => {
    const prompt = generalAgent.systemPrompt(context, []);
    expect(prompt).toContain("<skills>");
    expect(prompt).toContain("load-skill");
    expect(prompt).toContain("Available Skills");
  });

  it("includes available skills formatted in the prompt", () => {
    const prompt = generalAgent.systemPrompt(context, []);
    expect(prompt).toContain("product-manager");
    expect(prompt).toContain("warehouse-manager");
    expect(prompt).toContain("stock-movement-manager");
  });

  it("includes context as JSON", () => {
    const prompt = generalAgent.systemPrompt(context, []);
    expect(prompt).toContain("<current_context>");
    expect(prompt).toContain("/dashboard");
    expect(prompt).toContain("Dashboard");
  });

  it("includes execution logic section", () => {
    const prompt = generalAgent.systemPrompt(context, []);
    expect(prompt).toContain("<execution_logic>");
    expect(prompt).toContain("Error Handling");
  });

  it("snapshot matches expected structure", () => {
    const prompt = generalAgent.systemPrompt(context, []);
    expect(prompt).toMatchSnapshot();
  });
});
