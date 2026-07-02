import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "type-to-confirm",
    type: "registry:block",
    title: "Type-to-confirm",
    description:
      "The highest-stakes destroy guard — a dialog whose Delete button unlocks only once the operator types the resource's exact name.",
    registryDependencies: [
      "alert-dialog",
      "button",
      "card",
      "field",
      "input",
      "sidebar",
      "sonner",
    ],
    meta: { sfabKind: "block", iframeHeight: 720 },
    docs: [
      "Reserve `TypeNameConfirmDialog` for irreversible, org-scoped destroys",
      "(delete organization) — the destructive button stays disabled until the",
      "operator types the resource's exact name, so a one-click slip can't nuke",
      "it. The dialog is controlled: open it after your own guard, then run the",
      "mutation in `onConfirm`. Ordinary deletes only need `destructive-confirm`.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/confirm/type-to-confirm-page.tsx",
      },
      {
        path: "components/type-to-confirm-card.tsx",
        type: "registry:component",
        target: "src/features/confirm/components/type-to-confirm-card.tsx",
      },
      {
        path: "components/type-name-confirm-dialog.tsx",
        type: "registry:component",
        target: "src/features/confirm/components/type-name-confirm-dialog.tsx",
      },
    ],
  },
  preview: "page",
};

export default def;
