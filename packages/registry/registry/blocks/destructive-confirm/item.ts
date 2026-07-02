import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "destructive-confirm",
    type: "registry:block",
    title: "Destructive confirm",
    description:
      "The default destructive confirm — one AlertDialog with Cancel / Delete, then a post-commit toast.",
    registryDependencies: [
      "alert-dialog",
      "button",
      "card",
      "sidebar",
      "sonner",
    ],
    meta: { sfabKind: "block", iframeHeight: 720 },
    docs: [
      "The baseline for ordinary destroys: a single AlertDialog with Cancel /",
      "Delete. Run the mutation in the action's `onClick`, then confirm with a",
      "toast. Escalate to `type-to-confirm` only for irreversible, org-scoped",
      "deletes. Mount one `<Toaster />` at the shell for the post-commit toast.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/confirm/destructive-confirm-page.tsx",
      },
      {
        path: "components/destructive-confirm-card.tsx",
        type: "registry:component",
        target: "src/features/confirm/components/destructive-confirm-card.tsx",
      },
    ],
  },
  preview: "page",
};

export default def;
