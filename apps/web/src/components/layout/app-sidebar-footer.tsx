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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { AlertCircle, ChevronsUpDown, LogOut, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

function SidebarFooterSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton disabled size="lg">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <Skeleton className="mb-1 h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SidebarFooterError() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton disabled size="lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-destructive">
              Authentication Error
            </span>
            <span className="truncate text-muted-foreground text-xs">
              Please sign in again
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebarFooter() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: session,
    isPending: isSessionPending,
    error,
  } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();
  const {
    data: activeOrganization,
    refetch: refetchActiveOrganization,
    isPending: isOrgPending,
  } = authClient.useActiveOrganization();

  const user = session?.user;
  const isPending = isSessionPending || isOrgPending;

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

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/login" });
  };

  if (isPending) {
    return <SidebarFooterSkeleton />;
  }

  if (error || !user) {
    return <SidebarFooterError />;
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
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  alt={activeOrganization?.name ?? "Organization"}
                  src={activeOrganization?.logo ?? undefined}
                />
                <AvatarFallback className="rounded-lg">
                  {activeOrganization?.name?.substring(0, 2).toUpperCase() ??
                    "??"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeOrganization?.name ?? "No Organization"}
                </span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {organizations?.map((organization) => (
                <DropdownMenuItem
                  className="gap-2 p-2"
                  key={organization.id}
                  onClick={() => setActiveOrganization(organization.id)}
                >
                  <Avatar className="size-6 rounded-sm">
                    <AvatarImage src={organization.logo ?? undefined} />
                    <AvatarFallback className="rounded-sm">
                      {organization.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {organization.name}
                </DropdownMenuItem>
              ))}
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
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    alt={user.name ?? "User"}
                    src={user.image ?? undefined}
                  />
                  <AvatarFallback className="rounded-lg">
                    {user.name?.substring(0, 2).toUpperCase() ?? "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user.name ?? "User"}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-1">
              <ThemeToggle variant="icon" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
