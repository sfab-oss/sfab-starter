import type { RegistryItemDef } from "../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "button",
    type: "registry:ui",
    title: "Button",
    description: "Variants, sizes, icon, and disabled states.",
    registryDependencies: ["button"],
    meta: { sfabKind: "block" },
    files: [{ path: "button-demo.tsx", type: "registry:component" }],
  },
  preview: "button-demo",
};

export default def;
