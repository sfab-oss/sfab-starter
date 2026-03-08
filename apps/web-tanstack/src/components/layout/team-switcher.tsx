"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/shadcn/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { ChevronsUpDown, Plus } from "lucide-react";

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: organizations } = authClient.useListOrganizations();
  const {
    data: activeOrganization,
    refetch: refetchActiveOrganization,
    isPending,
  } = authClient.useActiveOrganization();

  const { mutate: setActiveOrganization } = useMutation({
    mutationFn: async (organizationId: string) => {
      await authClient.organization.setActive({
        organizationId,
      });
      return { organizationId };
    },
    onSuccess: ({ organizationId }) => {
      toast.success("Organization set as active");
      navigate({ to: "/" });
      refetchActiveOrganization();

      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            Array.isArray(queryKey) &&
            queryKey.length > 0 &&
            queryKey[0] === organizationId
          );
        },
      });

      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            Array.isArray(queryKey) &&
            (queryKey.includes("files") ||
              queryKey.includes("chats") ||
              queryKey.includes("projects") ||
              queryKey.includes("agents") ||
              queryKey.includes("members"))
          );
        },
      });
    },
  });

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <Skeleton className="h-full w-full rounded-lg" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!activeOrganization) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <p>No active organization</p>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <Avatar className="aspect-square size-8 rounded-lg">
                <AvatarImage src={activeOrganization.logo ?? undefined} />
                <AvatarFallback className="aspect-square size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {activeOrganization.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeOrganization.name}
                </span>
                <span className="truncate text-xs">
                  {activeOrganization.slug}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {organizations?.map((organization, index) => (
              <DropdownMenuItem
                className="gap-2 p-2"
                key={organization.id}
                onClick={() => setActiveOrganization(organization.id)}
              >
                <Avatar className="aspect-square size-6 rounded-sm">
                  <AvatarImage src={organization.logo ?? undefined} />
                  <AvatarFallback className="aspect-square size-6 rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
                    {organization.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {organization.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => navigate({ to: "/onboarding" })}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Create organization
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
