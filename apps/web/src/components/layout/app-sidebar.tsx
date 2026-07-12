"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { LogoMark } from "@workspace/ui/components/icons/logo-monochrome";
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
  useSidebar,
} from "@workspace/ui/components/shadcn/sidebar";
import { Search } from "lucide-react";
import { useState } from "react";
import { AppSidebarFooter } from "@/components/layout/app-sidebar-footer";
import {
  getPlatformNavigationItems,
  isPlatformNavActive,
} from "@/components/layout/platform-navigation";
import { SearchCommand } from "@/components/search/search-command";
import { m } from "@/paraglide/messages.js";

export function AppSidebar() {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LogoMark className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate font-semibold">
                {m.app_name()}
              </span>
              <span className="block truncate text-muted-foreground text-xs">
                {m.app_brand_subtitle()}
              </span>
            </div>

            <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
              <SidebarMenuButton
                className="h-8 w-8"
                onClick={() => setSearchOpen(true)}
                size="sm"
                tooltip={m.common_search()}
                variant="default"
              >
                <Search className="size-4" />
                <span className="sr-only">{m.common_search()}</span>
              </SidebarMenuButton>

              <SidebarTrigger
                className="hidden h-8 w-8 md:flex"
                toggleLabel={m.sidebar_toggle()}
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
          <SidebarMenuItem>
            <SidebarTrigger
              className="h-8 w-8"
              toggleLabel={m.sidebar_toggle()}
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setSearchOpen(true)}
              tooltip={m.common_search()}
            >
              <Search />
              <span>{m.common_search()}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <AppSidebarMainNavigation />
      </SidebarContent>
      <SidebarFooter>
        <AppSidebarFooter />
      </SidebarFooter>

      <SearchCommand open={searchOpen} setOpen={setSearchOpen} />
    </Sidebar>
  );
}
function useCloseMobileSidebarOnNavigate() {
  const { isMobile, setOpenMobile } = useSidebar();
  return () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
}
export function AppSidebarMainNavigation() {
  const closeOnNavigate = useCloseMobileSidebarOnNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const items = getPlatformNavigationItems();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{m.nav_platform()}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = isPlatformNavActive(pathname, item.url);
          return (
            <SidebarMenuItem key={`${item.url}`}>
              <SidebarMenuButton
                isActive={isActive}
                render={<Link onClick={closeOnNavigate} to={item.url} />}
                tooltip={item.title}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
