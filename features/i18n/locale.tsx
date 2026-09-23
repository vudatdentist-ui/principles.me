"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  parseLocale,
  type Locale,
} from "./config";
import { viMessages } from "./messages";
import { narrativeMessages } from "./narrative-messages";
type Vars = Record<string, string | number>;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, vars?: Vars) => string;
};

type LocaleStore = {
  getSnapshot: () => Locale;
  getServerSnapshot: () => Locale;
  subscribe: (listener: () => void) => () => void;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleStore | null>(null);

function createLocaleStore(initialLocale: Locale): LocaleStore {
  let fallbackLocale = initialLocale;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOCALE_STORAGE_KEY || event.key === null) notify();
  };
  return {
    getServerSnapshot: () => initialLocale,
    getSnapshot: () => {
      try {
        return parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY)) ?? initialLocale;
      } catch {
        return fallbackLocale;
      }
    },
    subscribe: (listener) => {
      if (listeners.size === 0) window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    setLocale: (next) => {
      fallbackLocale = next;
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // A blocked storage area must not prevent changing the current language.
      }
      notify();
    },
  };
}

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : match,
  );
}

export function translate(locale: Locale, source: string, vars?: Vars) {
  const template = locale === "vi" ? (narrativeMessages[source] ?? viMessages[source] ?? source) : source;
  return interpolate(template, vars);
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [store] = useState(() => createLocaleStore(initialLocale));
  return (
    <LocaleContext.Provider value={store}>
      <DocumentLanguage />
      {children}
    </LocaleContext.Provider>
  );
}

function DocumentLanguage() {
  const { locale } = useI18n();
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

export function useI18n(): LocaleContextValue {
  const store = useContext(LocaleContext);
  if (!store) throw new Error("useI18n must be used within LocaleProvider");
  // Each streamed boundary hydrates with the server locale before reading storage.
  // Updating only a parent context can replace late boundaries and duplicate IDs.
  const locale = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const t = useCallback(
    (source: string, vars?: Vars) => translate(locale, source, vars),
    [locale],
  );
  return { locale, setLocale: store.setLocale, t };
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
