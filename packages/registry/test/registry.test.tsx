import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@workspace/ui/components/shadcn/tooltip";
import { Suspense } from "react";
import { afterEach, describe, expect, it } from "vitest";
import registryJson from "../../../registry.json";
import { blocks, components, getSfabKind, REGISTRY } from "../src/index";

/**
 * Layer-1 harness: the registry's own CI gate (ADR-0017 Decision 5 / amendment).
 * Two guarantees — the generated manifest agrees with the source trees, and every
 * shipped item actually mounts — so a broken block fails here, in-repo, before it
 * can ever be `shadcn add`-ed into an adopter.
 */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const entries = Object.values(REGISTRY);

afterEach(cleanup);

describe("manifest", () => {
  it("registry.json covers exactly the runtime registry", () => {
    const manifestNames = registryJson.items.map((i) => i.name).sort();
    const runtimeNames = Object.keys(REGISTRY).sort();
    expect(manifestNames).toEqual(runtimeNames);
  });

  it("every item declares a valid sfabKind discriminator", () => {
    for (const entry of entries) {
      expect(["block", "pack"]).toContain(getSfabKind(entry));
    }
  });

  it("splits items by shadcn type without overlap or loss", () => {
    expect(components.length + blocks.length).toBe(entries.length);
    expect(components.every((e) => e.type === "registry:ui")).toBe(true);
    expect(blocks.every((e) => e.type === "registry:block")).toBe(true);
  });

  it("every manifest file path exists on disk", () => {
    for (const item of registryJson.items) {
      for (const file of item.files ?? []) {
        expect(existsSync(join(REPO_ROOT, file.path)), file.path).toBe(true);
      }
    }
  });
});

describe("items render", () => {
  it.each(
    entries.map((e) => [e.name, e] as const)
  )("%s mounts without throwing", async (_name, entry) => {
    const Preview = entry.component;
    const { container } = render(
      <TooltipProvider>
        <Suspense fallback={<div data-testid="loading" />}>
          <Preview />
        </Suspense>
      </TooltipProvider>
    );
    await waitFor(
      () =>
        expect(container.querySelector('[data-testid="loading"]')).toBeNull(),
      { timeout: 5000 }
    );
    expect(container.firstChild).toBeTruthy();
  });
});
