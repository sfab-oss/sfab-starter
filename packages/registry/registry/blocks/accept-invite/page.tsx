"use client";

import { Toaster } from "@workspace/ui/components/shadcn/sonner";
import { AcceptInviteForm } from "./components/accept-invite-form";
import { AuthShell } from "./components/auth-shell";

export default function AcceptInvitePage() {
  return (
    <>
      <AuthShell>
        <AcceptInviteForm />
      </AuthShell>
      <Toaster />
    </>
  );
}
