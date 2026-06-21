import { REGISTRY } from "./generated";
import type { RegistryEntry, SfabKind } from "./types";

export { REGISTRY } from "./generated";

/**
 * The runtime registry surface the gallery consumes.
 *
 * `REGISTRY` itself is GENERATED (`src/generated.ts`, from the `registry/<name>/`
 * source trees — see `scripts/build-registry.ts`); these helpers are the stable,
 * hand-written API over it. The two axes an item is sorted on:
 *
 * - shadcn `type` (`registry:ui` vs `registry:block`) decides how the gallery
 *   PREVIEWS it — inline component vs iframed full page.
 * - `meta.sfabKind` (`block` vs `pack`) decides the INSTALL contract — copy-in vs
 *   capability. These are independent; today every item is `sfabKind: "block"`.
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
