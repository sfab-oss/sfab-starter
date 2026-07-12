"use client";

import { ShellHeaderSidebarTrigger as ShellHeaderSidebarTriggerBase } from "@workspace/ui/components/brand/shell";
import { m } from "@/paraglide/messages.js";

export function ShellHeaderSidebarTrigger({
  className,
}: {
  className?: string;
}) {
  return (
    <ShellHeaderSidebarTriggerBase
      className={className}
      toggleLabel={m.sidebar_toggle()}
    />
  );
}
