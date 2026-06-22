import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "record-read-page",
    type: "registry:block",
    title: "Record read page",
    description:
      "Invoice record route — PropertyGrid and activity log on a full shell page (read-only).",
    registryDependencies: ["button", "collapsible", "popover", "sidebar"],
    meta: { sfabKind: "block", iframeHeight: 900 },
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/collect/record-read-page.tsx",
      },
      {
        path: "lib/payment-types.ts",
        type: "registry:lib",
        target: "src/features/collect/lib/payment-types.ts",
      },
      {
        path: "lib/mock-invoice-activity.tsx",
        type: "registry:lib",
        target: "src/features/collect/lib/mock-invoice-activity.tsx",
      },
      {
        path: "components/invoice-record-view.tsx",
        type: "registry:component",
        target: "src/features/collect/components/invoice-record-view.tsx",
      },
    ],
  },
  preview: "page",
};

export default def;
