/** Supported UI locales for tenant public pages. */

export const SUPPORTED_LOCALES = ["id", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "id";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "id" || value === "en";
}

/**
 * Resolves effective UI locale: user preference cookie wins, else journal default.
 */
export function resolveLocale(
  preference: string | null | undefined,
  journalDefault: string | null | undefined,
): AppLocale {
  if (isAppLocale(preference)) {
    return preference;
  }
  if (isAppLocale(journalDefault)) {
    return journalDefault;
  }
  return DEFAULT_LOCALE;
}
