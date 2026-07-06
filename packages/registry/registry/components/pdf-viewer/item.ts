import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "pdf-viewer",
    type: "registry:ui",
    title: "PDF viewer",
    description:
      "Continuous fit-to-width PDF reader on react-pdf (pdf.js) — scroll, zoom, page X of N, loading/error states, layout-neutral.",
    dependencies: ["react-pdf", "pdfjs-dist"],
    meta: { sfabKind: "block" },
    files: [{ path: "pdf-viewer-demo.tsx", type: "registry:component" }],
  },
  preview: "pdf-viewer-demo",
};

export default def;
