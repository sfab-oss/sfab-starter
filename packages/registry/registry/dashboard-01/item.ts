import type { RegistryItemDef } from "../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "dashboard-01",
    type: "registry:block",
    title: "Operator dashboard",
    description:
      "The full app shell — collapsible sidebar, header, stat cards, a data table, and an activity feed.",
    registryDependencies: ["sidebar", "card", "badge", "button"],
    meta: { sfabKind: "block", iframeHeight: 860 },
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/routes/dashboard-01.tsx",
      },
      { path: "components/gallery-sidebar.tsx", type: "registry:component" },
      { path: "components/inventory-table.tsx", type: "registry:component" },
    ],
  },
  preview: "page",
};

export default def;
