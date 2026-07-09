import {
  FileText,
  Home,
  type LucideIcon,
  Package,
  Settings,
  Users,
} from "lucide-react";

export interface PlatformNavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

/** Single source for sidebar + ⌘K Pages group. */
export const platformNavigationItems: PlatformNavigationItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Catalog", url: "/catalog", icon: Package },
  { title: "Entities", url: "/entities", icon: Users },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

/** Home is exact; other items stay active on nested paths (e.g. /settings/*). */
export function isPlatformNavActive(pathname: string, url: string): boolean {
  if (url === "/") {
    return pathname === "/";
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}
