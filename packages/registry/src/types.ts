import type { LazyExoticComponent } from "react";
import type { RegistryItem } from "shadcn/schema";

/**
 * The install-contract discriminator (ADR-0017, 2026-06-21 amendment) — see the
 * package README for the full `block` vs `pack` contract. It rides in shadcn's
 * free-form `meta`, so one registry and one item primitive serve both kinds. Every
 * item today is a `block`; the first `pack` is POS.
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
 * What each `registry/{blocks,components}/<name>/item.ts` default-exports — the
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
