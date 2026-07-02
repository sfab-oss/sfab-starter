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
    docs: [
      "Before wiring your API, clean up hooks/use-people.ts: delete the two",
      "`GALLERY PREVIEW ONLY` fenced blocks and the preview import, then use the",
      "`PRODUCTION:` return on the last line of usePeopleList. What's left is a plain",
      "useQuery over your fetch function — no other files need edits.",
    ].join("\n"),
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
      {
        path: "components/resource-list-collection-state.tsx",
        type: "registry:component",
        target:
          "src/features/people/components/resource-list-collection-state.tsx",
      },
    ],
  },
  // `preview.tsx` wraps `page.tsx` with a gallery-only mode switcher; it and the
  // preview seam (`hooks/use-list-preview.tsx`) are intentionally NOT in `files`,
  // so production installs ship only the production-grade `page.tsx`.
  preview: "preview",
};

export default def;
