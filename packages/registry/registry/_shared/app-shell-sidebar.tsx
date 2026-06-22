"use client";

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
import { useCommandPaletteShortcut } from "@workspace/ui/hooks/use-command-palette-shortcut";
import {
  type NavigationItem,
  SIDEBAR_NAVIGATION,
} from "@workspace/ui/lib/navigation-config";
import { Boxes, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { useCommandPaletteSearch } from "../blocks/command-palette/hooks/use-command-palette-search";
import { CommandPalette } from "./command-palette";
import { SidebarUserMenu } from "./sidebar-user-menu";

export function AppShellSidebar({
  activeId = "today",
  items = SIDEBAR_NAVIGATION,
  initialCommandPaletteOpen = false,
}: {
  activeId?: string;
  items?: NavigationItem[];
  /** Gallery: open the command palette on first paint (command-palette preview). */
  initialCommandPaletteOpen?: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(initialCommandPaletteOpen);

  const toggleSearch = useCallback(() => {
    setSearchOpen((open) => !open);
  }, []);

  useCommandPaletteShortcut(toggleSearch);

  const { data: commandPaletteSearch } = useCommandPaletteSearch();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="size-5" />
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate font-semibold">
                Northside Distributors
              </span>
              <span className="block truncate text-muted-foreground text-xs">
                Operations
              </span>
            </div>
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
              <SidebarMenuButton
                className="h-8 w-8"
                onClick={() => setSearchOpen(true)}
                size="sm"
                tooltip="Search"
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
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={item.id === activeId}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span
                    className={
                      item.comingSoon ? "text-muted-foreground" : undefined
                    }
                  >
                    {item.label}
                  </span>
                  {item.comingSoon ? (
                    <span className="ml-auto text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
                      Soon
                    </span>
                  ) : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserMenu />
      </SidebarFooter>

      <CommandPalette
        actions={commandPaletteSearch?.actions ?? []}
        onNavigate={() => setSearchOpen(false)}
        onOpenChange={setSearchOpen}
        onSearchSelect={() => setSearchOpen(false)}
        open={searchOpen}
        searchGroups={commandPaletteSearch?.searchGroups ?? []}
      />
    </Sidebar>
  );
}
