import {
  type AppLocale,
  INTL_LOCALE,
  isAppLocale,
} from "@workspace/i18n/locales";
import { type Locale as DateFnsLocale, es } from "date-fns/locale";
import { getLocale } from "@/paraglide/runtime.js";

const DATE_FNS_LOCALE: Record<AppLocale, DateFnsLocale | undefined> = {
  en: undefined,
  es,
};

export function appLocale(): AppLocale {
  const locale = getLocale();
  return isAppLocale(locale) ? locale : "en";
}

/** BCP 47 tag for `formatMoneyMinor` / `Intl`. */
export function intlLocale(locale: AppLocale = appLocale()): string {
  return INTL_LOCALE[locale];
}

export function dateFnsLocale(
  locale: AppLocale = appLocale()
): DateFnsLocale | undefined {
  return DATE_FNS_LOCALE[locale];
}

export function formatMoney(
  amountMinor: number,
  currencyCode: string,
  formatMoneyMinor: (
    amount: number,
    currency: string,
    options?: { locale?: string }
  ) => string
): string {
  return formatMoneyMinor(amountMinor, currencyCode, {
    locale: intlLocale(),
  });
}
