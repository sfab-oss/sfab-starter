"use client";

/**
 * GALLERY-ONLY preview seam. Nothing here ships — it is not in the block's
 * `item.ts` `files` list. It only names which placeholder states the block demos;
 * the shared context mechanism lives in `_shared/preview-mode`. Unlike the list
 * block, no production file reads this — the three placeholders are plain
 * components, so the gallery `preview.tsx` composes them directly.
 */

import { createPreviewMode } from "../../../_shared/preview-mode";

export type PlaceholderPreviewMode = "coming-soon" | "not-found" | "empty";

const preview = createPreviewMode<PlaceholderPreviewMode>({
  modes: [
    { value: "coming-soon", label: "Coming soon" },
    { value: "not-found", label: "Not found" },
    { value: "empty", label: "Empty" },
  ],
  defaultMode: "coming-soon",
});

export const PLACEHOLDER_PREVIEW_MODES = preview.MODES;
export const PlaceholderPreviewProvider = preview.Provider;
export const usePlaceholderPreviewMode = preview.useMode;
export const usePlaceholderPreviewControls = preview.useControls;
