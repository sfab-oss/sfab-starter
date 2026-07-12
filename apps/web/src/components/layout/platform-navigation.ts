import {
  FileText,
  Home,
  type LucideIcon,
  Package,
  Settings,
  Users,
} from "lucide-react";
import { m } from "@/paraglide/messages.js";

export interface PlatformNavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

/** Single source for sidebar + ⌘K Pages group — titles follow active locale. */
export function getPlatformNavigationItems(): PlatformNavigationItem[] {
  return [
    { title: m.nav_home(), url: "/", icon: Home },
    { title: m.nav_catalog(), url: "/catalog", icon: Package },
    { title: m.nav_entities(), url: "/entities", icon: Users },
    { title: m.nav_documents(), url: "/documents", icon: FileText },
    { title: m.nav_settings(), url: "/settings", icon: Settings },
  ];
}

/** Home is exact; other items stay active on nested paths (e.g. /settings/*). */
export function isPlatformNavActive(pathname: string, url: string): boolean {
  if (url === "/") {
    return pathname === "/";
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}
