"use client";

import {
  type AppLocale,
  LOCALE_LABELS,
  LOCALES,
} from "@workspace/i18n/locales";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { Languages } from "lucide-react";
import { m } from "@/paraglide/messages.js";
import { getLocale, setLocale } from "@/paraglide/runtime.js";

export function LanguageSwitcher() {
  const current = getLocale() as AppLocale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label={m.language_label()} size="icon" variant="ghost" />
        }
      >
        <Languages className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup
          onValueChange={(value) => {
            if (value === current) {
              return;
            }
            setLocale(value as AppLocale);
          }}
          value={current}
        >
          {LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              {LOCALE_LABELS[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
