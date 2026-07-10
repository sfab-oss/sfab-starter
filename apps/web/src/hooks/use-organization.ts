"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@workspace/auth/client";
import { client } from "@/lib/client";

export const getInvitationKey = (id: string) => ["invitation", id];

export const useActiveOrganizationId = () => {
  const { data: session } = authClient.useSession();
  return session?.session?.activeOrganizationId;
};

export const useInvitation = (id: string) =>
  useQuery({
    queryKey: getInvitationKey(id),
    queryFn: async () => {
      const res = await client.protected.organization.invitation[":id"].$get({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Invitation not found");
      }
      return res.json();
    },
    enabled: !!id,
  });

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (res.error) {
        throw new Error(res.error.message ?? "Failed to accept invitation");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["activeOrganization"] });
    },
  });
};

export const useRejectInvitation = () =>
  useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await authClient.organization.rejectInvitation({
        invitationId,
      });
      if (res.error) {
        throw new Error(res.error.message ?? "Failed to reject invitation");
      }
      return res.data;
    },
  });

export const useInviteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: "member" | "admin" | "owner";
    }) => {
      const res = await authClient.organization.inviteMember({
        email,
        role,
      });
      if (res.error) {
        throw new Error(res.error.message ?? "Failed to invite member");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activeOrganization"],
      });
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberIdOrEmail }: { memberIdOrEmail: string }) => {
      const res = await authClient.organization.removeMember({
        memberIdOrEmail,
      });
      if (res.error) {
        throw new Error(res.error.message ?? "Failed to remove member");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activeOrganization"],
      });
    },
  });
};

export const useCancelInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await authClient.organization.cancelInvitation({
        invitationId,
      });
      if (res.error) {
        throw new Error(res.error.message ?? "Failed to cancel invitation");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activeOrganization"],
      });
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const res = await authClient.organization.delete({
        organizationId,
      });
      if (res.error) {
        throw new Error(res.error.message ?? "Failed to delete organization");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activeOrganization"],
      });
      queryClient.invalidateQueries({
        queryKey: ["organizations"],
      });
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      slug,
      logo,
    }: {
      name?: string;
      slug?: string;
      logo?: string;
    }) => {
      const res = await authClient.organization.update({
        data: { name, slug, logo },
      });
      if (res.error) {
        throw new Error(res.error.message ?? "Failed to update organization");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activeOrganization"],
      });
      queryClient.invalidateQueries({
        queryKey: ["organizations"],
      });
    },
  });
};
