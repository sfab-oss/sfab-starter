import { readFileSync, writeFileSync } from "node:fs";

export interface PackProvenanceEntry {
  ref: string;
  installedAt: string;
}

export interface TemplateProvenance {
  ref: string;
  version?: string;
  packs: Record<string, PackProvenanceEntry>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPackEntry(name: string, value: unknown): PackProvenanceEntry {
  if (
    !(
      isRecord(value) &&
      typeof value.ref === "string" &&
      typeof value.installedAt === "string"
    )
  ) {
    throw new Error(`invalid packs.${name} entry`);
  }
  return { ref: value.ref, installedAt: value.installedAt };
}

export function applyPackProvenance(
  manifest: unknown,
  name: string,
  entry: PackProvenanceEntry
): TemplateProvenance {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("pack name is required");
  }
  const ref = entry.ref.trim();
  const installedAt = entry.installedAt.trim();
  if (!(ref && installedAt)) {
    throw new Error("pack provenance requires ref and installedAt");
  }
  if (!(isRecord(manifest) && typeof manifest.ref === "string")) {
    throw new Error("template provenance requires a ref");
  }

  const packsRaw = isRecord(manifest.packs) ? manifest.packs : {};
  const packs: Record<string, PackProvenanceEntry> = {};
  for (const [key, value] of Object.entries(packsRaw)) {
    packs[key] = readPackEntry(key, value);
  }
  packs[trimmed] = { ref, installedAt };

  const next: TemplateProvenance = { ref: manifest.ref, packs };
  if (typeof manifest.version === "string") {
    next.version = manifest.version;
  }
  return next;
}

export function writePackProvenance(
  filePath: string,
  name: string,
  entry: PackProvenanceEntry
): TemplateProvenance {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  const next = applyPackProvenance(raw, name, entry);
  writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}
