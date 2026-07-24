import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  FileText,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

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

/** Single source for sidebar nav + command palette Go-to (operator-ux §8 Phase 0). */
export const NAVIGATION_CONFIG: NavigationItem[] = [
  { id: "today", label: "Today", path: "/", icon: Home },
  { id: "sell", label: "Sell", path: "/sell", icon: ShoppingCart },
  { id: "collect", label: "Collect", path: "/collect", icon: Banknote },
  {
    id: "buy",
    label: "Buy",
    path: "/buy",
    icon: FileText,
    comingSoon: true,
  },
  { id: "catalog", label: "Catalog", path: "/catalog", icon: Package },
  { id: "people", label: "People", path: "/people", icon: Users },
  {
    id: "documents",
    label: "Documents",
    path: "/documents",
    icon: FileText,
    commandPaletteOnly: true,
  },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings },
];

export const SIDEBAR_NAVIGATION = NAVIGATION_CONFIG.filter(
  (item) => !item.commandPaletteOnly
);

export const COMMAND_PALETTE_NAVIGATION: NavigationItem[] = [
  ...NAVIGATION_CONFIG,
];
