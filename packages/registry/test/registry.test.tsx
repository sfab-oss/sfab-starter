import { existsSync, readFileSync } from "node:fs";
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

/** Pack `target`s are authored for `shadcn add -c apps/web`. */
function packTargetToRepoPath(target: string): string {
  if (target.startsWith("~/")) {
    return join("apps/web", target.slice(2));
  }
  if (target.startsWith("src/")) {
    return join("apps/web", target);
  }
  return target;
}

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

  it("mcp pack lists layer slices, not only skill.md", () => {
    const mcp = packItems.find((item) => item.name === "mcp");
    expect(mcp).toBeDefined();
    const paths = (mcp?.files ?? []).map((file) => file.path);
    expect(paths.some((path) => path.endsWith("/skill.md"))).toBe(true);
    expect(paths.some((path) => path.endsWith("/oauth.ts"))).toBe(true);
    expect(paths.some((path) => path.endsWith("/register-mcp-tools.ts"))).toBe(
      true
    );
    expect(
      paths.some((path) => path.endsWith("/mcp-settings-section.tsx"))
    ).toBe(true);
    expect(paths.some((path) => path.endsWith("/mcp.workerd.test.ts"))).toBe(
      true
    );
    expect(paths.some((path) => path.endsWith("/docs/mcp.md"))).toBe(false);
    expect(
      paths.some((path) => path.includes("/drizzle/") && path.endsWith(".sql"))
    ).toBe(false);
  });

  it("mcp pack skill names install deps, route gen, and workerd verify", () => {
    const skill = readFileSync(
      join(REPO_ROOT, "packages/registry/registry/packs/mcp/skill.md"),
      "utf8"
    );
    expect(skill).toContain("@better-auth/oauth-provider");
    expect(skill).toContain("apps/web/package.json");
    expect(skill).toContain("@modelcontextprotocol/server");
    expect(skill).toContain("pnpm --filter web generate-routes");
    expect(skill).toContain("test/api/mcp.workerd.test.ts");
  });

  it("mcp pack docs is a non-empty string and no target leaves apps/web", () => {
    const mcp = packItems.find((item) => item.name === "mcp");
    expect(mcp).toBeDefined();
    expect(typeof mcp?.docs).toBe("string");
    expect((mcp?.docs ?? "").trim().length).toBeGreaterThan(0);
    for (const file of (mcp?.files ?? []) as Array<{ target?: string }>) {
      const target = file.target ?? "";
      expect(target.includes(".."), target).toBe(false);
    }
  });

  it("mcp pack install targets are absent from the kept tree", () => {
    const mcp = packItems.find((item) => item.name === "mcp");
    expect(mcp).toBeDefined();
    const keep = new Set(["docs/guides/mcp.md", ".agents/skills/mcp/SKILL.md"]);
    for (const file of (mcp?.files ?? []) as Array<{
      path: string;
      target?: string;
    }>) {
      const target = file.target;
      if (!target) {
        continue;
      }
      const repoPath = packTargetToRepoPath(target);
      if (keep.has(repoPath)) {
        continue;
      }
      expect(existsSync(join(REPO_ROOT, repoPath)), repoPath).toBe(false);
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
