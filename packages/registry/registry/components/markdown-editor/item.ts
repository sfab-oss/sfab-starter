import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "markdown-editor",
    type: "registry:ui",
    title: "Markdown editor",
    description:
      "BlockNote WYSIWYG markdown editor — controlled value/onChange, trimmed formatting toolbar, theme-aware, layout-neutral.",
    dependencies: ["@blocknote/react", "@blocknote/shadcn", "next-themes"],
    meta: { sfabKind: "block" },
    files: [{ path: "markdown-editor-demo.tsx", type: "registry:component" }],
  },
  preview: "markdown-editor-demo",
};

export default def;
