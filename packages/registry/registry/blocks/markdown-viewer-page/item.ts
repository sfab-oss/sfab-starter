import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "markdown-viewer-page",
    type: "registry:block",
    title: "Markdown viewer page",
    description:
      "Documents route — a read-only markdown document on a full shell page, with header actions.",
    registryDependencies: ["button", "dialog", "sidebar"],
    meta: { sfabKind: "block", iframeHeight: 820 },
    docs: [
      "Swap `SAMPLE_MARKDOWN` for the document you load (a store record, a File, or",
      "an API response). The same editor authors and displays markdown — drop the",
      "`readOnly` prop to make the page editable.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/documents/markdown-viewer-page.tsx",
      },
      {
        path: "lib/sample-markdown.ts",
        type: "registry:lib",
        target: "src/features/documents/lib/sample-markdown.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
