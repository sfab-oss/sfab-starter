import { BlockViewer } from "@workspace/ui-ds/components/view/block-viewer";
import type { registryItemFileSchema } from "@workspace/ui-ds/config/schema";
import { highlightCode } from "@workspace/ui-ds/lib/highlight-code";
import {
  createFileTreeForRegistryItemFiles,
  getRegistryItem,
} from "@workspace/ui-ds/lib/registry";
// biome-ignore lint/performance/noNamespaceImport: Ok
import * as React from "react";
import type { z } from "zod";

export async function BlockDisplay({ name }: { name: string }) {
  const item = await getCachedRegistryItem(name);

  if (!item?.files) {
    return null;
  }

  const [tree, highlightedFiles] = await Promise.all([
    getCachedFileTree(item.files),
    getCachedHighlightedFiles(item.files),
  ]);

  return (
    <BlockViewer highlightedFiles={highlightedFiles} item={item} tree={tree} />
  );
}

const getCachedRegistryItem = React.cache(async (name: string) => {
  return await getRegistryItem(name);
});

const getCachedFileTree = React.cache(
  async (files: Array<{ path: string; target?: string }>) => {
    if (!files) {
      return null;
    }

    return await createFileTreeForRegistryItemFiles(files);
  }
);

const getCachedHighlightedFiles = React.cache(
  async (files: z.infer<typeof registryItemFileSchema>[]) => {
    return await Promise.all(
      files.map(async (file) => ({
        ...file,
        highlightedContent: await highlightCode(file.content ?? ""),
      }))
    );
  }
);
