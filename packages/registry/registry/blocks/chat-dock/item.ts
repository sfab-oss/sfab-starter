import type { RegistryItemDef } from "../../../src/types";

const def: RegistryItemDef = {
  item: {
    name: "chat-dock",
    type: "registry:block",
    title: "Chat dock",
    description:
      "Bottom-docked assistant widget — a launcher that opens a compact chat window and expands into a large view with the workspace file viewer.",
    registryDependencies: [
      "bubble",
      "button",
      "collapsible",
      "drawer",
      "dropdown-menu",
      "empty",
      "input-group",
      "message",
      "message-scroller",
      "popover",
      "resizable",
      "sheet",
      "sidebar",
    ],
    dependencies: ["streamdown"],
    meta: { sfabKind: "block", iframeHeight: 900 },
    files: [
      {
        path: "page.tsx",
        type: "registry:page",
        target: "src/routes/assistant-dock.tsx",
      },
      {
        path: "components/chat-dock.tsx",
        type: "registry:component",
        target: "src/features/assistant-dock/components/chat-dock.tsx",
      },
      {
        path: "components/chat-history-panel.tsx",
        type: "registry:component",
        target: "src/features/assistant-dock/components/chat-history-panel.tsx",
      },
      {
        path: "components/chat-input.tsx",
        type: "registry:component",
        target: "src/features/assistant-dock/components/chat-input.tsx",
      },
      {
        path: "components/chat-message-parts.tsx",
        type: "registry:component",
        target: "src/features/assistant-dock/components/chat-message-parts.tsx",
      },
      {
        path: "components/chat-side-panel.tsx",
        type: "registry:component",
        target: "src/features/assistant-dock/components/chat-side-panel.tsx",
      },
      {
        path: "components/file-explorer-tree.tsx",
        type: "registry:component",
        target: "src/features/assistant-dock/components/file-explorer-tree.tsx",
      },
      {
        path: "hooks/use-chat-dock.ts",
        type: "registry:hook",
        target: "src/features/assistant-dock/hooks/use-chat-dock.ts",
      },
      {
        path: "hooks/use-chat-side-panel.ts",
        type: "registry:hook",
        target: "src/features/assistant-dock/hooks/use-chat-side-panel.ts",
      },
      {
        path: "lib/mock-chat-messages.ts",
        type: "registry:lib",
        target: "src/features/assistant-dock/lib/mock-chat-messages.ts",
      },
      {
        path: "lib/mock-chats.ts",
        type: "registry:lib",
        target: "src/features/assistant-dock/lib/mock-chats.ts",
      },
      {
        path: "lib/mock-workspace-tree.ts",
        type: "registry:lib",
        target: "src/features/assistant-dock/lib/mock-workspace-tree.ts",
      },
      {
        path: "lib/mock-members.ts",
        type: "registry:lib",
        target: "src/features/assistant-dock/lib/mock-members.ts",
      },
    ],
  },
  preview: "page",
};

export default def;
