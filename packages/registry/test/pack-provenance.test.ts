import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyPackProvenance,
  writePackProvenance,
} from "../src/pack-provenance";

const ENTRY = {
  ref: "a1b2c3d4e5f6789012345678901234567890abcd",
  installedAt: "2026-09-04T18:30:00.000Z",
};

describe("applyPackProvenance", () => {
  it("appends packs.<name> with ref and installedAt only", () => {
    const next = applyPackProvenance(
      { ref: ENTRY.ref, version: "0.4.0", packs: {} },
      "mcp",
      ENTRY
    );
    expect(next).toEqual({
      ref: ENTRY.ref,
      version: "0.4.0",
      packs: { mcp: ENTRY },
    });
  });

  it("never writes a mode field", () => {
    const next = applyPackProvenance({ ref: ENTRY.ref, packs: {} }, "mcp", {
      ...ENTRY,
      mode: "forked",
    } as typeof ENTRY & { mode: string });
    expect(next.packs.mcp).toEqual(ENTRY);
    expect(JSON.stringify(next)).not.toContain("mode");
  });

  it("replaces an existing pack entry without dropping others", () => {
    const next = applyPackProvenance(
      {
        ref: ENTRY.ref,
        packs: {
          other: {
            ref: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            installedAt: "2026-01-01T00:00:00.000Z",
          },
          mcp: {
            ref: "cccccccccccccccccccccccccccccccccccccccc",
            installedAt: "2026-01-02T00:00:00.000Z",
          },
        },
      },
      "mcp",
      ENTRY
    );
    expect(next.packs.other?.ref).toBe(
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    );
    expect(next.packs.mcp).toEqual(ENTRY);
  });
});

describe("writePackProvenance", () => {
  it("round-trips a template.json file", () => {
    const dir = mkdtempSync(join(tmpdir(), "sfab-pack-provenance-"));
    const file = join(dir, "template.json");
    writeFileSync(
      file,
      `${JSON.stringify({ ref: ENTRY.ref, packs: {} }, null, 2)}\n`
    );
    writePackProvenance(file, "mcp", ENTRY);
    const written = JSON.parse(readFileSync(file, "utf8")) as {
      packs: { mcp: { ref: string; installedAt: string; mode?: string } };
    };
    expect(written.packs.mcp).toEqual(ENTRY);
    expect(written.packs.mcp.mode).toBeUndefined();
  });
});
