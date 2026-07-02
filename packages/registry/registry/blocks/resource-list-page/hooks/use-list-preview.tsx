"use client";

/**
 * GALLERY-ONLY preview seam for the people list. Nothing here ships — it is not in
 * the block's `item.ts` `files` list. It only names *which* states this block
 * demos; the shared context mechanism lives in `_shared/preview-mode`. The one
 * production file that reads this is `use-people.ts`, inside a clearly-fenced block
 * you delete when you copy the block into a real app.
 */

import { createPreviewMode } from "../../../_shared/preview-mode";

export type ListPreviewMode = "live" | "loading" | "empty" | "error";

const preview = createPreviewMode<ListPreviewMode>({
  modes: [
    { value: "live", label: "Live" },
    { value: "loading", label: "Loading" },
    { value: "empty", label: "Empty" },
    { value: "error", label: "Error" },
  ],
  defaultMode: "live",
});

/** Ordered for the dock; `live` is the real data path. */
export const LIST_PREVIEW_MODES = preview.MODES;
export const ListPreviewProvider = preview.Provider;
/** Current preview mode — `"live"` when there is no provider (i.e. production). */
export const useListPreviewMode = preview.useMode;
/** For the gallery dock to read + set the mode. Null outside a provider. */
export const useListPreviewControls = preview.useControls;
