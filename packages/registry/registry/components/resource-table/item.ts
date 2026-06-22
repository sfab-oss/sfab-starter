import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "resource-table",
    type: "registry:ui",
    title: "Resource table",
    description:
      "Extended DataTable with drill-in row click, inline CTA, and kebab actions.",
    registryDependencies: ["table", "button", "dropdown-menu", "input"],
    meta: { sfabKind: "block" },
    files: [{ path: "resource-table-demo.tsx", type: "registry:component" }],
  },
  preview: "resource-table-demo",
};

export default def;
