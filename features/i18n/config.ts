export type Locale = "vi" | "en";

export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_HEADER = "x-principles-locale";
export const LOCALE_STORAGE_KEY = "principles.locale";

export function parseLocale(value: string | null | undefined): Locale | null {
  return value === "vi" || value === "en" ? value : null;
}

export function localeFromHeaders(headers: { get(name: string): string | null }): Locale {
  return parseLocale(headers.get(LOCALE_HEADER)) ?? DEFAULT_LOCALE;
}
