export type MemberRole = "owner" | "admin" | "member";

export interface MockMember {
  id: string;
  userId: string;
  role: MemberRole;
  user: {
    name: string;
    email: string;
    initials: string;
  };
}

export interface MockInvitation {
  id: string;
  email: string;
  role: MemberRole;
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
}

export interface MockOrganization {
  id: string;
  name: string;
  slug: string;
  members: MockMember[];
  invitations: MockInvitation[];
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Operator",
};

export const MOCK_ORGANIZATION: MockOrganization = {
  id: "org-northside",
  name: "Northside Distributors",
  slug: "northside-distributors",
  members: [
    {
      id: "member-1",
      userId: "user-sarah",
      role: "admin",
      user: {
        name: "Sarah Chen",
        email: "sarah.chen@northside.com",
        initials: "SC",
      },
    },
    {
      id: "member-2",
      userId: "user-carlos",
      role: "member",
      user: {
        name: "Carlos Mendez",
        email: "carlos.mendez@northside.com",
        initials: "CM",
      },
    },
    {
      id: "member-3",
      userId: "user-ana",
      role: "member",
      user: {
        name: "Ana Lopez",
        email: "ana.lopez@northside.com",
        initials: "AL",
      },
    },
  ],
  invitations: [
    {
      id: "inv-1",
      email: "james.wilson@northside.com",
      role: "member",
      status: "pending",
      expiresAt: "2026-07-15T00:00:00.000Z",
    },
  ],
};
