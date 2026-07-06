import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "spreadsheet-viewer",
    type: "registry:ui",
    title: "Spreadsheet viewer",
    description:
      "Read-only .xlsx viewer on Univer (open-source Luckysheet successor) with the client-side LuckyExcel importer — styles, merges, formulas, theme-aware, layout-neutral.",
    dependencies: [
      "@univerjs/core",
      "@univerjs/preset-sheets-core",
      "@univerjs/themes",
      "@zwight/luckyexcel",
      "next-themes",
    ],
    meta: { sfabKind: "block" },
    files: [
      { path: "spreadsheet-viewer-demo.tsx", type: "registry:component" },
    ],
  },
  preview: "spreadsheet-viewer-demo",
};

export default def;
