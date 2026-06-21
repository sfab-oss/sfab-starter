import { REGISTRY } from "./generated";
import type { RegistryEntry, SfabKind } from "./types";

export { REGISTRY } from "./generated";

/**
 * The stable, hand-written API over the GENERATED `REGISTRY` map (`src/generated.ts`,
 * built from the `registry/<name>/` trees by `scripts/build-registry.ts`). An item
 * is sorted on two independent axes: shadcn `type` (preview shape) and
 * `meta.sfabKind` (install contract) — see each helper below.
 */

export function getEntry(name: string): RegistryEntry | undefined {
  return REGISTRY[name];
}

const entries = Object.values(REGISTRY);

/** Component demos rendered inline (shadcn `registry:ui`). */
export const components = entries.filter((e) => e.type === "registry:ui");

/** Full-page compositions rendered in an iframe (shadcn `registry:block`). */
export const blocks = entries.filter((e) => e.type === "registry:block");

/** Embedded-preview height (px) for a block, from shadcn's `meta.iframeHeight`. */
export function getIframeHeight(entry: RegistryEntry): number {
  const h = entry.meta.iframeHeight;
  return typeof h === "number" ? h : 600;
}

/** The install-contract kind: `block` (copy-in) vs `pack` (capability). */
export function getSfabKind(entry: RegistryEntry): SfabKind {
  return entry.meta.sfabKind;
}
