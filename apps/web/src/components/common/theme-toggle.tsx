"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import { SidebarMenuButton } from "@workspace/ui/components/shadcn/sidebar";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";

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
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <SidebarMenuButton onClick={toggleTheme} size="sm" tooltip="Toggle theme">
      <SunIcon className="hidden [html.dark_&]:block" />
      <MoonIcon className="hidden [html.light_&]:block" />
      <span>Toggle theme</span>
    </SidebarMenuButton>
  );
};
