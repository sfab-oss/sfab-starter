import type { LazyExoticComponent } from "react";
import type { RegistryItem } from "shadcn/schema";

/**
 * The install-contract discriminator (ADR-0017, 2026-06-21 amendment).
 *
 * - `block` — a copy-in UI item: `shadcn add` drops the files and that's it. No
 *   `skill.md`, no `.sfab/template.json` provenance, no Layer-2 eval.
 * - `pack`  — a capability item: the SAME primitive carrying extra layer slices
 *   (`db/contract/core/server/tools`) plus an ephemeral `skill.md`. Install also
 *   runs the skill, writes provenance, and triggers a Layer-2 eval on change.
 *
 * It rides in shadcn's free-form `meta`, so one registry and one item primitive
 * serve both kinds (UNIFY). Every item today is a `block`; the first `pack` is POS.
 */
export type SfabKind = "block" | "pack";

export type SfabMeta = {
  sfabKind: SfabKind;
  /** Embedded-preview height (px) for an iframed block — shadcn's convention. */
  iframeHeight?: number;
} & Record<string, unknown>;

/** A shadcn registry item whose `meta` carries the SFAB discriminator. */
export type SfabRegistryItem = RegistryItem & { meta: SfabMeta };

/**
 * What each `registry/<name>/item.ts` default-exports — the single authoring
 * source for one item.
 *
 * - `item` is the shadcn `RegistryItem` that lands in the generated root
 *   `registry.json`. Authors write `files[].path` RELATIVE to the item directory;
 *   the build rewrites them repo-root-relative (the GitHub-registry requirement).
 * - `preview` names the file under the item directory (no extension) to lazy-load
 *   for the gallery preview.
 */
export interface RegistryItemDef {
  item: SfabRegistryItem;
  preview: string;
}

/**
 * A gallery-ready entry: the display subset of the manifest plus the lazily
 * loaded preview component. The build emits a map of these into `src/generated.ts`.
 */
export type RegistryEntry = Pick<
  SfabRegistryItem,
  "name" | "type" | "title" | "description"
> & {
  meta: SfabMeta;
  component: LazyExoticComponent<() => React.JSX.Element>;
};
