import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "shell",
    type: "registry:ui",
    title: "Shell",
    description:
      "App shell compound layout — sidebar frame, page header row, and main content slot.",
    registryDependencies: ["button", "sidebar"],
    meta: { sfabKind: "block", iframeHeight: 720 },
    files: [{ path: "shell-demo.tsx", type: "registry:component" }],
  },
  preview: "shell-demo",
};

export default def;
