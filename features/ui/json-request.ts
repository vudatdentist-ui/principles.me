import { LOCALE_HEADER, parseLocale } from "@/features/i18n/config";

export async function jsonRequest<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type"))
    headers.set("content-type", "application/json");
  if (!headers.has(LOCALE_HEADER) && typeof document !== "undefined") {
    const locale = parseLocale(document.documentElement.lang);
    if (locale) headers.set(LOCALE_HEADER, locale);
  }
  const response = await fetch(url, { ...init, headers });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }
  if (payload === null) throw new Error("Request failed.");
  return payload as T;
}
