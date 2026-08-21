"use client";

import { DropdownMenuItem } from "@workspace/ui/components/shadcn/dropdown-menu";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { m } from "@/paraglide/messages.js";

export function ThemeMenuItem() {
  const { theme, setTheme } = useTheme() as {
    theme: string | undefined;
    setTheme: (theme: string) => void;
  };

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return (
    <DropdownMenuItem onSelect={toggleTheme}>
      <SunIcon className="hidden [html.dark_&]:block" />
      <MoonIcon className="hidden [html.light_&]:block" />
      {m.theme_toggle()}
    </DropdownMenuItem>
  );
}
