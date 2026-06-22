import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "settings-page",
    type: "registry:block",
    title: "Settings page",
    description:
      "Full-route org settings — organization details, member invites, members table, and pending invitations (gallery mock, admin+ surface).",
    registryDependencies: [
      "button",
      "drawer",
      "input",
      "select",
      "table",
      "sidebar",
    ],
    meta: { sfabKind: "block", iframeHeight: 900 },
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/routes/_protected/settings/route.tsx",
      },
      {
        path: "components/settings-page-content.tsx",
        type: "registry:component",
        target: "src/features/settings/components/settings-page-content.tsx",
      },
      {
        path: "components/organization-details-form.tsx",
        type: "registry:component",
        target:
          "src/features/settings/components/organization-details-form.tsx",
      },
      {
        path: "components/invite-member-form.tsx",
        type: "registry:component",
        target: "src/features/settings/components/invite-member-form.tsx",
      },
      {
        path: "components/members-tables.tsx",
        type: "registry:component",
        target: "src/features/settings/components/members-tables.tsx",
      },
      {
        path: "lib/mock-organization.ts",
        type: "registry:lib",
        target: "src/features/settings/lib/mock-organization.ts",
      },
      {
        path: "lib/settings-sections.ts",
        type: "registry:lib",
        target: "src/features/settings/lib/settings-sections.ts",
      },
      {
        path: "lib/settings-schemas.ts",
        type: "registry:lib",
        target: "src/features/settings/lib/settings-schemas.ts",
      },
      {
        path: "lib/fetch-organization-settings.ts",
        type: "registry:lib",
        target: "src/features/settings/lib/fetch-organization-settings.ts",
      },
      {
        path: "hooks/use-organization-settings.ts",
        type: "registry:hook",
        target: "src/features/settings/hooks/use-organization-settings.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
