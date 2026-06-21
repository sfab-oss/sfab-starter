import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@workspace/ui/components/shadcn/sidebar";
import { Boxes, Home, Package, Settings, Warehouse } from "lucide-react";

/**
 * The collapsible icon sidebar for the operator dashboard block — a branded
 * header plus the platform nav with an active item. Mock state only.
 */

const NAV = [
  { title: "Home", icon: Home, active: true },
  { title: "Inventory", icon: Package, active: false },
  { title: "Warehouses", icon: Warehouse, active: false },
  { title: "Settings", icon: Settings, active: false },
];

export function GallerySidebar() {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate font-semibold">
                Acme Inventory
              </span>
              <span className="block truncate text-muted-foreground text-xs">
                Operations
              </span>
            </div>
            <SidebarTrigger className="hidden h-8 w-8 group-data-[collapsible=icon]:hidden md:flex" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {NAV.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton isActive={item.active} tooltip={item.title}>
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
