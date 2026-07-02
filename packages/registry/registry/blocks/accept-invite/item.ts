import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "accept-invite",
    type: "registry:block",
    title: "Accept invite",
    description:
      "Centered invite-acceptance route — org + role context over a name + password card, zod-validated.",
    registryDependencies: ["button", "card", "field", "input", "sonner"],
    meta: { sfabKind: "block", iframeHeight: 720 },
    docs: [
      "`AuthShell` is the shared centered frame for every unauthenticated route.",
      "`AcceptInviteForm` takes the org, invited email, and role as props — resolve",
      "them from the invite token on the server. Swap the mock `onSubmit` for your",
      "accept-invite call.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/routes/accept-invite.tsx",
      },
      {
        path: "components/auth-shell.tsx",
        type: "registry:component",
        target: "src/features/auth/components/auth-shell.tsx",
      },
      {
        path: "components/accept-invite-form.tsx",
        type: "registry:component",
        target: "src/features/auth/components/accept-invite-form.tsx",
      },
      {
        path: "lib/accept-invite-schema.ts",
        type: "registry:lib",
        target: "src/features/auth/lib/accept-invite-schema.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
