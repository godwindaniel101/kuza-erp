"use client";

/*
 * Lightweight client-side i18n for the Kuza marketing site.
 *
 * Deliberately minimal: no locale-prefixed routes, no middleware, no server
 * negotiation. The site is statically generated in English (the default), and
 * the visible copy swaps on the client when a visitor picks a language from the
 * nav. The choice is persisted to localStorage so it survives navigation and
 * reloads.
 *
 * Hydration-safe: state always initialises to `en` (matching the server-
 * rendered HTML). A visitor's stored preference is applied in an effect after
 * mount, so the first paint never mismatches the server.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import es from "@/messages/es.json";
import de from "@/messages/de.json";
import ha from "@/messages/ha.json";

export type Locale = "en" | "fr" | "es" | "de" | "ha";

type Messages = Record<string, string>;

// English is the source of truth for the key set; other locales fall back to it.
const MESSAGES: Record<Locale, Messages> = { en, fr, es, de, ha };

export const LOCALES: { code: Locale; native: string }[] = [
  { code: "en", native: "English" },
  { code: "fr", native: "Français" },
  { code: "es", native: "Español" },
  { code: "de", native: "Deutsch" },
  { code: "ha", native: "Hausa" },
];

const STORAGE_KEY = "kuza-locale";
const DEFAULT_LOCALE: Locale = "en";

function isLocale(v: string | null): v is Locale {
  return v === "en" || v === "fr" || v === "es" || v === "de" || v === "ha";
}

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Apply the visitor's stored preference after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored) && stored !== DEFAULT_LOCALE) {
        setLocaleState(stored);
      }
    } catch {
      /* localStorage unavailable (private mode / blocked) — stay on default */
    }
  }, []);

  // Keep <html lang> honest for accessibility/SEO as the locale changes.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore persistence failures */
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const table = MESSAGES[locale];
      return table[key] ?? MESSAGES.en[key] ?? key;
    },
    [locale],
  );

  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}

/** Returns the `t(key)` translator for the current locale. */
export function useT(): (key: string) => string {
  return useLocale().t;
}
