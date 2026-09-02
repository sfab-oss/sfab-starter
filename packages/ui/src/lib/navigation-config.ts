import type { LucideIcon } from "lucide-react";
import { FileText, Home, Package, Settings, Users } from "lucide-react";

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Visible but muted — routes to coming-soon. */
  comingSoon?: boolean;
  /** Hidden from sidebar but reachable via ⌘K Go-to. */
  commandPaletteOnly?: boolean;
}

/**
 * Registry/gallery sidebar + command palette Go-to.
 * Paths match the live app IA (`apps/web` file routes /
 * `platform-navigation.ts`): Catalog / Entities / Documents.
 */
export const NAVIGATION_CONFIG: NavigationItem[] = [
  { id: "home", label: "Home", path: "/", icon: Home },
  { id: "catalog", label: "Catalog", path: "/catalog", icon: Package },
  { id: "entities", label: "Entities", path: "/entities", icon: Users },
  { id: "documents", label: "Documents", path: "/documents", icon: FileText },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings },
];

export const SIDEBAR_NAVIGATION = NAVIGATION_CONFIG.filter(
  (item) => !item.commandPaletteOnly
);

export const COMMAND_PALETTE_NAVIGATION: NavigationItem[] = [
  ...NAVIGATION_CONFIG,
];
