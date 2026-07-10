"use client";

import { Avatar, AvatarFallback } from "@workspace/ui/components/shadcn/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/shadcn/sidebar";
import { ChevronsUpDown, LogOut, Plus } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const MOCK_ORGANIZATIONS = [
  {
    id: "northside",
    name: "Northside Distributors",
    initials: "ND",
  },
  {
    id: "central-plant",
    name: "Central Plant",
    initials: "CP",
  },
] as const;
const MOCK_ACTIVE_ORG = MOCK_ORGANIZATIONS[0];
const MOCK_USER = {
  name: "Sarah Chen",
  email: "sarah.chen@northside.com",
  initials: "SC",
};

/** Gallery mock — org switcher, user identity, theme toggle, and sign out. */
export function SidebarUserMenu() {
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
              />
            }
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg">
                {MOCK_ACTIVE_ORG.initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {MOCK_ACTIVE_ORG.name}
              </span>
              <span className="truncate text-xs">{MOCK_USER.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Organizations
              </DropdownMenuLabel>
              {MOCK_ORGANIZATIONS.map((organization, index) => (
                <DropdownMenuItem className="gap-2 p-2" key={organization.id}>
                  <Avatar className="size-6 rounded-sm">
                    <AvatarFallback className="rounded-sm">
                      {organization.initials}
                    </AvatarFallback>
                  </Avatar>
                  {organization.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Create organization
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {MOCK_USER.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {MOCK_USER.name}
                    </span>
                    <span className="truncate text-xs">{MOCK_USER.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="p-1">
              <ThemeToggle variant="icon" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
