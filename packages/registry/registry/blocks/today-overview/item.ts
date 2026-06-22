import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "today-overview",
    type: "registry:block",
    title: "Today overview",
    description:
      "Operator home — primary actions, honest KPI tiles, action items, and a capped inventory movements feed.",
    registryDependencies: ["button", "sidebar"],
    meta: { sfabKind: "block", iframeHeight: 900 },
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/routes/index.tsx",
      },
      {
        path: "components/today-overview-content.tsx",
        type: "registry:component",
        target: "src/features/today/components/today-overview-content.tsx",
      },
      {
        path: "components/today-kpi-tile.tsx",
        type: "registry:component",
        target: "src/features/today/components/today-kpi-tile.tsx",
      },
      {
        path: "components/today-action-items.tsx",
        type: "registry:component",
        target: "src/features/today/components/today-action-items.tsx",
      },
      {
        path: "components/inventory-movements-feed.tsx",
        type: "registry:component",
        target: "src/features/today/components/inventory-movements-feed.tsx",
      },
      {
        path: "lib/mock-today-metrics.ts",
        type: "registry:lib",
        target: "src/features/today/lib/mock-today-metrics.ts",
      },
      {
        path: "lib/mock-inventory-movements.ts",
        type: "registry:lib",
        target: "src/features/today/lib/mock-inventory-movements.ts",
      },
      {
        path: "lib/fetch-today-overview.ts",
        type: "registry:lib",
        target: "src/features/today/lib/fetch-today-overview.ts",
      },
      {
        path: "hooks/use-today-overview.ts",
        type: "registry:hook",
        target: "src/features/today/hooks/use-today-overview.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
