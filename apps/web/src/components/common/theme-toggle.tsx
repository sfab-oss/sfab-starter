"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import { SidebarMenuButton } from "@workspace/ui/components/shadcn/sidebar";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { m } from "@/paraglide/messages.js";

export const ThemeToggle = ({
  variant = "default",
}: {
  variant?: "default" | "icon";
}) => {
  const { theme, setTheme } = useTheme() as {
    theme: string | undefined;
    setTheme: (theme: string) => void;
  };

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  if (variant === "icon") {
    return (
      <Button onClick={toggleTheme} size="icon" variant="ghost">
        <SunIcon className="hidden [html.dark_&]:block" />
        <MoonIcon className="hidden [html.light_&]:block" />
        <span className="sr-only">{m.theme_toggle()}</span>
      </Button>
    );
  }

  return (
    <SidebarMenuButton
      onClick={toggleTheme}
      size="sm"
      tooltip={m.theme_toggle()}
    >
      <SunIcon className="hidden [html.dark_&]:block" />
      <MoonIcon className="hidden [html.light_&]:block" />
      <span>{m.theme_toggle()}</span>
    </SidebarMenuButton>
  );
};
