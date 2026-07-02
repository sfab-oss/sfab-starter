import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "sign-up",
    type: "registry:block",
    title: "Sign up",
    description:
      "Centered sign-up route — name, email, and password card on the shared auth shell, zod-validated.",
    registryDependencies: ["button", "card", "field", "input", "sonner"],
    meta: { sfabKind: "block", iframeHeight: 720 },
    docs: [
      "`AuthShell` is the shared centered frame for every unauthenticated route.",
      "The form validates with zod via `zodResolver` — swap the mock `onSubmit` for",
      "your create-account call. The 'Sign in' cross-link is inert; wire it to your",
      "router.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/routes/sign-up.tsx",
      },
      {
        path: "components/auth-shell.tsx",
        type: "registry:component",
        target: "src/features/auth/components/auth-shell.tsx",
      },
      {
        path: "components/sign-up-form.tsx",
        type: "registry:component",
        target: "src/features/auth/components/sign-up-form.tsx",
      },
      {
        path: "lib/sign-up-schema.ts",
        type: "registry:lib",
        target: "src/features/auth/lib/sign-up-schema.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
