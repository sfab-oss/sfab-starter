/** Shipped app locales — keep in sync with `project.inlang/settings.json`. */
export const LOCALES = ["en", "es"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const BASE_LOCALE: AppLocale = "en";

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
};

/** BCP 47 tags for `Intl` / `formatMoneyMinor` / dates. */
export const INTL_LOCALE: Record<AppLocale, string> = {
  en: "en-US",
  es: "es-419",
};

export function isAppLocale(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}
