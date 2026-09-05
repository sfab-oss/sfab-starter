import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "mcp",
    type: "registry:block",
    title: "MCP server",
    description:
      "Opt-in MCP OAuth + Streamable HTTP. Skeleton: install skill only until the layer slices land.",
    meta: { sfabKind: "pack" },
    files: [
      {
        path: "skill.md",
        type: "registry:file",
        target: "skill.md",
      },
    ],
  },
};

export default def;
