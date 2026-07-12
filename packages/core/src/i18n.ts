/**
 * Locale catalogs and Paraglide runtime live outside `core`:
 * - Source catalogs: `@workspace/i18n` (`packages/i18n/messages`)
 * - Compiled messages: `apps/web/src/paraglide` (Vite / `pnpm i18n:compile`)
 *
 * Re-export the locale constants so domain code can pass a BCP-47 tag into
 * formatters without importing the web surface.
 */
export {
  type AppLocale,
  BASE_LOCALE,
  INTL_LOCALE,
  isAppLocale,
  LOCALE_LABELS,
  LOCALES,
} from "@workspace/i18n/locales";
