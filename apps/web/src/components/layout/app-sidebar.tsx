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
  isPlatformNavActive,
  platformNavigationItems,
} from "@/components/layout/platform-navigation";
import { SearchCommand } from "@/components/search/search-command";
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
              <span className="block truncate font-semibold">Acme Inc.</span>
              <span className="block truncate text-muted-foreground text-xs">
                Starter
              </span>
            </div>

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
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {platformNavigationItems.map((item) => {
          const isActive = isPlatformNavActive(pathname, item.url);
          return (
            <SidebarMenuItem key={`${item.title}-${item.url}`}>
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
