import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "coming-soon-page",
    type: "registry:block",
    title: "Coming soon page",
    description:
      "Honest full-page states — coming soon, not found, and empty — for routes that aren't built or have no data yet.",
    registryDependencies: ["button", "empty", "sidebar"],
    meta: { sfabKind: "block", iframeHeight: 720 },
    docs: [
      "Import whichever placeholder a route needs from",
      "`components/page-placeholder.tsx` — the three are independent. `page.tsx`",
      "wires `ComingSoonPage` into the Buy route; swap in `EmptyResourcePage` once",
      "the feature ships, or render `NotFoundPage` from a route's notFound handler.",
      "Never fake data — an honest placeholder beats a hollow screen.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/features/buy/page.tsx",
      },
      {
        path: "components/page-placeholder.tsx",
        type: "registry:component",
        target: "src/features/buy/components/page-placeholder.tsx",
      },
    ],
  },
  // `preview.tsx` + the gallery-only preview seam (`hooks/use-placeholder-preview`)
  // are intentionally NOT in `files`; production ships only the two files above.
  preview: "preview",
};

export default def;
