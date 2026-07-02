import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "sign-in",
    type: "registry:block",
    title: "Sign in",
    description:
      "Centered sign-in route — brand mark over an email + password card, zod-validated.",
    registryDependencies: ["button", "card", "field", "input", "sonner"],
    meta: { sfabKind: "block", iframeHeight: 720 },
    docs: [
      "`AuthShell` is the shared centered frame for every unauthenticated route.",
      "The form validates with zod via `zodResolver` — swap the mock `onSubmit` for",
      "your auth call. The 'Sign up' cross-link is inert; wire it to your router.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/routes/sign-in.tsx",
      },
      {
        path: "components/auth-shell.tsx",
        type: "registry:component",
        target: "src/features/auth/components/auth-shell.tsx",
      },
      {
        path: "components/sign-in-form.tsx",
        type: "registry:component",
        target: "src/features/auth/components/sign-in-form.tsx",
      },
      {
        path: "lib/sign-in-schema.ts",
        type: "registry:lib",
        target: "src/features/auth/lib/sign-in-schema.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
