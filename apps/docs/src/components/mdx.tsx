import { Button } from "@workspace/ui/components/shadcn/button";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { BlockViewer } from "@/components/block-viewer";
import { ComponentPreview } from "@/components/component-preview";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Button,
    BlockViewer,
    ComponentPreview,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
