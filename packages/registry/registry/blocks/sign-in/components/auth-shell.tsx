"use client";

import { Boxes } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Centered pre-app shell for unauthenticated surfaces — sign in, sign up, accept
 * invite, onboarding. No sidebar, no app chrome: a brand mark over a single card,
 * so the same frame serves every route before the user is in the app.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex items-center gap-2 font-semibold text-lg">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="size-5" />
        </div>
        Northside
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
