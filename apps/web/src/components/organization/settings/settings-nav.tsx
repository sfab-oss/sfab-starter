"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/shadcn/drawer";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/shadcn/sidebar";
import { Menu } from "lucide-react";
import { useState } from "react";

export interface SettingsNavItem {
  label: string;
  to: string;
}

export interface SettingsNavSection {
  items: SettingsNavItem[];
  /** Omitted for top-level nouns that aren't grouped under a heading. */
  label?: string;
}

export function isSettingsItemActive(
  activePath: string,
  item: SettingsNavItem
): boolean {
  return activePath === item.to || activePath.startsWith(`${item.to}/`);
}

export function findActiveSettingsItem(
  activePath: string,
  sections: SettingsNavSection[]
): SettingsNavItem | null {
  for (const section of sections) {
    for (const item of section.items) {
      if (isSettingsItemActive(activePath, item)) {
        return item;
      }
    }
  }
  return null;
}

export function SettingsNav({
  activePath,
  onItemSelect,
  onNavigate,
  sections,
}: {
  activePath: string;
  onItemSelect?: (to: string) => void;
  onNavigate?: () => void;
  sections: SettingsNavSection[];
}) {
  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.label ?? section.items[0]?.to}>
          {section.label ? (
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => {
                const isActive = isSettingsItemActive(activePath, item);
                return (
                  <SidebarMenuItem key={item.to + item.label}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => {
                        onItemSelect?.(item.to);
                        onNavigate?.();
                      }}
                      type="button"
                    >
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

export function SettingsMobileSectionTrigger({
  activePath,
  mobileTitle = "Settings",
  onItemSelect,
  sections,
}: {
  activePath: string;
  mobileTitle?: string;
  onItemSelect?: (to: string) => void;
  sections: SettingsNavSection[];
}) {
  const [open, setOpen] = useState(false);
  const active = findActiveSettingsItem(activePath, sections);

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <DrawerTrigger asChild>
        <Button
          className="w-full justify-start gap-2"
          size="sm"
          variant="outline"
        >
          <Menu className="h-4 w-4" />
          <span className="font-normal">{active?.label ?? mobileTitle}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{mobileTitle}</DrawerTitle>
          <DrawerDescription>Pick a section</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-2 overflow-y-auto px-2 pb-6">
          <SettingsNav
            activePath={activePath}
            onItemSelect={onItemSelect}
            onNavigate={() => setOpen(false)}
            sections={sections}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function SettingsSectionLayout({
  activePath,
  children,
  mobileTitle = "Settings",
  onItemSelect,
  sections,
}: {
  activePath: string;
  children: React.ReactNode;
  mobileTitle?: string;
  onItemSelect?: (to: string) => void;
  sections: SettingsNavSection[];
}) {
  return (
    <div
      className="flex flex-1 flex-col overflow-hidden md:flex-row"
      data-slot="settings-section-layout"
    >
      <aside className="hidden w-56 shrink-0 border-r md:flex md:flex-col">
        <div className="flex flex-col gap-2 p-2">
          <SettingsNav
            activePath={activePath}
            onItemSelect={onItemSelect}
            sections={sections}
          />
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="border-b p-3 md:hidden">
          <SettingsMobileSectionTrigger
            activePath={activePath}
            mobileTitle={mobileTitle}
            onItemSelect={onItemSelect}
            sections={sections}
          />
        </div>
        <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
