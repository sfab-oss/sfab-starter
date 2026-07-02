"use client";

/**
 * GALLERY-ONLY preview entrypoint (`item.ts` `preview: "preview"`). Wraps the
 * real, production-grade `page.tsx` with the preview provider + the shared,
 * draggable state dock. None of this is in the block's `files` list, so
 * production installs only ship `page.tsx` — which has zero awareness that
 * preview exists.
 */

import { PreviewStateDock } from "../../_shared/preview-state-dock";
import {
  LIST_PREVIEW_MODES,
  type ListPreviewMode,
  ListPreviewProvider,
  useListPreviewControls,
} from "./hooks/use-list-preview";
import ResourceListPage from "./page";

function PreviewControls() {
  const controls = useListPreviewControls();

  if (!controls) {
    return null;
  }

  return (
    <PreviewStateDock
      onValueChange={(value) => controls.setMode(value as ListPreviewMode)}
      options={LIST_PREVIEW_MODES}
      value={controls.mode}
    />
  );
}

export default function ResourceListPagePreview() {
  return (
    <ListPreviewProvider>
      <ResourceListPage />
      <PreviewControls />
    </ListPreviewProvider>
  );
}
