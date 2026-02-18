import type { RegistryItem } from "@workspace/ui-ds/config/schema";

export const examples: RegistryItem[] = [
  // App Layout Examples
  {
    name: "app-layout-basic",
    type: "registry:example",
    title: "Basic Layout",
    description: "Simple layout with header and content using AppSidebar",
    files: [
      {
        path: "examples/app-layout-basic.tsx",
        type: "registry:example",
      },
    ],
  },
  {
    name: "app-layout-no-header",
    type: "registry:example",
    title: "Layout Without Header",
    description: "Minimal layout without header for cleaner interfaces",
    files: [
      {
        path: "examples/app-layout-no-header.tsx",
        type: "registry:example",
      },
    ],
  },
];
