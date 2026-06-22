import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "resource-list-page",
    type: "registry:block",
    title: "Resource list page",
    description:
      "Full list page — app shell, list page shell, filter toolbar, resource table, and a React Query hook on mock data.",
    registryDependencies: ["table", "button", "badge", "input", "sidebar"],
    meta: { sfabKind: "block", iframeHeight: 900 },
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/people/page.tsx",
      },
      {
        path: "lib/people/types.ts",
        type: "registry:lib",
        target: "src/features/people/lib/people/types.ts",
      },
      {
        path: "lib/people/mock-people.ts",
        type: "registry:lib",
        target: "src/features/people/lib/people/mock-people.ts",
      },
      {
        path: "lib/people/fetch-people.ts",
        type: "registry:lib",
        target: "src/features/people/lib/people/fetch-people.ts",
      },
      {
        path: "hooks/use-people.ts",
        type: "registry:hook",
        target: "src/features/people/hooks/use-people.ts",
      },
      {
        path: "components/people/people-columns.tsx",
        type: "registry:component",
        target: "src/features/people/components/people/people-columns.tsx",
      },
    ],
  },
  preview: "page",
};

export default def;
