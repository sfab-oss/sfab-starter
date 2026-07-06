import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "spreadsheet-viewer-page",
    type: "registry:block",
    title: "Spreadsheet viewer page",
    description:
      "Documents route — a read-only .xlsx spreadsheet on a full shell page, with header actions.",
    registryDependencies: ["button", "dialog", "sidebar"],
    meta: { sfabKind: "block", iframeHeight: 820 },
    docs: [
      "Swap `SAMPLE_WORKBOOK` for the workbook you load — the viewer accepts a URL,",
      "a File, or raw bytes, so point it at your document store or an upload.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/documents/spreadsheet-viewer-page.tsx",
      },
      {
        path: "lib/sample-workbook.ts",
        type: "registry:lib",
        target: "src/features/documents/lib/sample-workbook.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
