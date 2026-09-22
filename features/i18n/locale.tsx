"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  parseLocale,
  type Locale,
} from "./config";
import { viMessages } from "./messages";
type Vars = Record<string, string | number>;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, vars?: Vars) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

export function translate(locale: Locale, source: string, vars?: Vars) {
  const template = locale === "vi" ? (viMessages[source] ?? source) : source;
  return interpolate(template, vars);
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored && stored !== initialLocale) setLocaleState(stored);
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (source: string, vars?: Vars) => translate(locale, source, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useI18n must be used within LocaleProvider");
  return value;
}

export function T({ children, vars }: { children: string; vars?: Vars }) {
  const { t } = useI18n();
  return <>{t(children, vars)}</>;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <select
      aria-label={t("Language")}
      className={className}
      onChange={(event) => setLocale(event.target.value as Locale)}
      value={locale}
    >
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  );
}
