import type { RegistryItem } from "@workspace/ui-ds/config/schema";

export const ui: RegistryItem[] = [
  {
    name: "app-layout",
    type: "registry:ui",
    title: "App Layout",
    description:
      "A comprehensive layout system with sidebar navigation, resizable panels, and organized content areas.",
    meta: {
      examples: [
        {
          name: "app-layout-basic",
          title: "Basic Layout",
          description: "Simple layout with header and content using AppSidebar",
        },
        {
          name: "app-layout-no-header",
          title: "Layout Without Header",
          description: "Minimal layout without header for cleaner interfaces",
        },
      ],
    },
    files: [
      {
        path: "../ui/src/components/brand/app-layout.tsx",
        type: "registry:ui",
      },
    ],
    registryDependencies: ["button", "resizable", "separator", "sidebar"],
  },
];
