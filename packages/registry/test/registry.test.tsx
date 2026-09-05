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
  const packItems = registryJson.items.filter(
    (item) => (item.meta as { sfabKind?: string }).sfabKind === "pack"
  );

  it("registry.json is the gallery plus every pack", () => {
    const manifestNames = registryJson.items.map((i) => i.name).sort();
    const galleryNames = Object.keys(REGISTRY).sort();
    const packNames = packItems.map((i) => i.name).sort();
    expect([...galleryNames, ...packNames].sort()).toEqual(manifestNames);
  });

  it("gallery items are sfabKind block", () => {
    for (const entry of entries) {
      expect(getSfabKind(entry)).toBe("block");
    }
  });

  it("every registry.json item declares a valid sfabKind", () => {
    for (const item of registryJson.items) {
      expect(["block", "pack"]).toContain(
        (item.meta as { sfabKind?: string }).sfabKind
      );
    }
  });

  it("splits gallery items by shadcn type without overlap or loss", () => {
    expect(components.length + blocks.length).toBe(entries.length);
    expect(components.every((e) => e.type === "registry:ui")).toBe(true);
    expect(blocks.every((e) => e.type === "registry:block")).toBe(true);
  });

  it("every pack lists skill.md and is absent from the gallery", () => {
    expect(packItems.length).toBeGreaterThan(0);
    for (const pack of packItems) {
      expect(REGISTRY[pack.name]).toBeUndefined();
      expect(
        (pack.files ?? []).some((file) => file.path.endsWith("/skill.md")),
        pack.name
      ).toBe(true);
    }
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
  // GitHub-hosted runners are slower than Blacksmith; heavy blocks (e.g.
  // spreadsheet-viewer) can exceed the default 5s vitest + waitFor budget.
  const MOUNT_TIMEOUT_MS = 15_000;

  it.each(entries.map((e) => [e.name, e] as const))(
    "%s mounts without throwing",
    async (_name, entry) => {
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
        { timeout: MOUNT_TIMEOUT_MS }
      );
      expect(container.firstChild).toBeTruthy();
    },
    MOUNT_TIMEOUT_MS + 5000
  );
});
