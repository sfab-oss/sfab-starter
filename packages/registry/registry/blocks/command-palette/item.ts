import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "command-palette",
    type: "registry:block",
    title: "Command palette",
    description:
      "⌘K / sidebar search — go-to navigation from navigation-config (no faked entity search).",
    registryDependencies: ["button", "sidebar", "dialog"],
    meta: { sfabKind: "block", iframeHeight: 720 },
    docs: [
      "Swap `fetchCommandPaletteSearch` for your search endpoint —",
      "`useCommandPaletteSearch` feeds the palette through React Query, so its loading",
      "and error rows are already wired. Go-to entries come from `navigation-config`;",
      "the mock fetch adds a delay you can drop.",
    ].join("\n"),
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/routes/command-palette.tsx",
      },
      {
        path: "lib/fetch-command-palette-search.ts",
        type: "registry:lib",
        target: "src/features/search/lib/fetch-command-palette-search.ts",
      },
      {
        path: "hooks/use-command-palette-search.ts",
        type: "registry:hook",
        target: "src/features/search/hooks/use-command-palette-search.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
