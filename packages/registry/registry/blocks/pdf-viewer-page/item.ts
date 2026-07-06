import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "pdf-viewer-page",
    type: "registry:block",
    title: "PDF viewer page",
    description:
      "Documents route — a continuous, fit-to-width PDF reader on a full shell page, with header actions.",
    registryDependencies: ["button", "dialog", "sidebar"],
    meta: { sfabKind: "block", iframeHeight: 820 },
    docs: [
      "Swap `SAMPLE_PDF` for the document you load — the viewer accepts a URL, a",
      "File, or raw bytes, so point it at your document store or an upload.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/documents/pdf-viewer-page.tsx",
      },
      {
        path: "lib/sample-pdf.ts",
        type: "registry:lib",
        target: "src/features/documents/lib/sample-pdf.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
