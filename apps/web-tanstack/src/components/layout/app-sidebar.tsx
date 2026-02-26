"use client";

import { Link } from "@tanstack/react-router";
import { LogoAlwurtsMonochrome } from "@workspace/ui/components/icons/logo-monochrome";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@workspace/ui/components/shadcn/sidebar";
import {
  Home,
  type LucideIcon,
  Package,
  Search,
  Settings,
  Warehouse,
} from "lucide-react";
import { useState } from "react";
import { AppUserNav } from "@/components/layout/app-user-nav";
import { SearchCommand } from "@/components/search/search-command";

interface NavigationItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

const mainNavigationItems: NavigationItem[] = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Warehouses",
    url: "/inventory/warehouses",
    icon: Warehouse,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            {/* Logo Area */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LogoAlwurtsMonochrome className="h-5 w-5" />
            </div>

            {/* App Title (Visible when expanded) */}
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate font-semibold">TanStack</span>
              <span className="block truncate text-muted-foreground text-xs">
                Start App
              </span>
            </div>

            {/* Top Actions (Search + Toggle) */}
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
              <SidebarMenuButton
                className="h-8 w-8"
                onClick={() => setSearchOpen(true)}
                size="sm"
                tooltip="Search"
                variant="default"
              >
                <Search className="size-4" />
                <span className="sr-only">Search</span>
              </SidebarMenuButton>

              <SidebarTrigger className="hidden h-8 w-8 md:flex" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Collapsed Mode: Search + Toggle Buttons */}
        <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
          <SidebarMenuItem>
            <SidebarTrigger className="h-8 w-8" />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setSearchOpen(true)}
              tooltip="Search"
            >
              <Search />
              <span>Search</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <AppSidebarMainNavigation />
      </SidebarContent>
      <SidebarFooter>
        <AppUserNav />
      </SidebarFooter>

      <SearchCommand open={searchOpen} setOpen={setSearchOpen} />
    </Sidebar>
  );
}

export function AppSidebarMainNavigation() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {mainNavigationItems.map((item) => (
          <SidebarMenuItem key={`${item.title}-${item.url}`}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <Link to={item.url}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
