import type { RegistryItemDef } from "../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "badge",
    type: "registry:ui",
    title: "Badge",
    description: "Status labels in every variant.",
    registryDependencies: ["badge"],
    meta: { sfabKind: "block" },
    files: [{ path: "badge-demo.tsx", type: "registry:component" }],
  },
  preview: "badge-demo",
};

export default def;
