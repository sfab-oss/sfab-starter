import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "record-edit-page",
    type: "registry:block",
    title: "Record edit page",
    description:
      "Invoice edit route — due date and notes form on a full shell page with activity log.",
    registryDependencies: [
      "button",
      "calendar",
      "collapsible",
      "field",
      "input",
      "popover",
      "sidebar",
      "textarea",
    ],
    meta: { sfabKind: "block", iframeHeight: 900 },
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/collect/record-edit-page.tsx",
      },
      {
        path: "lib/payment-types.ts",
        type: "registry:lib",
        target: "src/features/collect/lib/payment-types.ts",
      },
      {
        path: "lib/invoice-edit-schema.ts",
        type: "registry:lib",
        target: "src/features/collect/lib/invoice-edit-schema.ts",
      },
      {
        path: "lib/mock-invoice-activity.tsx",
        type: "registry:lib",
        target: "src/features/collect/lib/mock-invoice-activity.tsx",
      },
      {
        path: "components/invoice-edit-form.tsx",
        type: "registry:component",
        target: "src/features/collect/components/invoice-edit-form.tsx",
      },
    ],
  },
  preview: "page",
};

export default def;
