"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps } from "react";

export function ChatContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "@container flex h-full min-h-0 min-w-0 max-w-screen flex-1 flex-col bg-background",
        className
      )}
      {...props}
    />
  );
}
