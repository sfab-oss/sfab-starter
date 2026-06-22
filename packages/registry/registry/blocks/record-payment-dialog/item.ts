import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "record-payment-dialog",
    type: "registry:block",
    title: "Record payment dialog",
    description:
      "Collect hub with record-payment dialog open by default — money fields plus activity log (MXN minor units).",
    registryDependencies: [
      "button",
      "calendar",
      "collapsible",
      "dialog",
      "field",
      "input",
      "popover",
      "sidebar",
    ],
    meta: { sfabKind: "block", iframeHeight: 900 },
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/collect/record-payment-dialog-page.tsx",
      },
      {
        path: "lib/payment-types.ts",
        type: "registry:lib",
        target: "src/features/collect/lib/payment-types.ts",
      },
      {
        path: "lib/payment-form-schema.ts",
        type: "registry:lib",
        target: "src/features/collect/lib/payment-form-schema.ts",
      },
      {
        path: "lib/mock-invoice-activity.tsx",
        type: "registry:lib",
        target: "src/features/collect/lib/mock-invoice-activity.tsx",
      },
      {
        path: "lib/mock-open-invoices.ts",
        type: "registry:lib",
        target: "src/features/collect/lib/mock-open-invoices.ts",
      },
      {
        path: "components/open-invoices-columns.tsx",
        type: "registry:component",
        target: "src/features/collect/components/open-invoices-columns.tsx",
      },
      {
        path: "components/payment-form.tsx",
        type: "registry:component",
        target: "src/features/collect/components/payment-form.tsx",
      },
      {
        path: "components/payment-form-dialog.tsx",
        type: "registry:component",
        target: "src/features/collect/components/payment-form-dialog.tsx",
      },
    ],
  },
  preview: "page",
};

export default def;
