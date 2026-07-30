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
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// useLayoutEffect on the client (runs BEFORE the browser paints → the locale
// swap is applied before anything is shown, so no English flash), and useEffect
// on the server to avoid the "useLayoutEffect does nothing on the server" warning.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

  // Resolve the visitor's locale BEFORE the first paint (layout effect → no
  // English flash): their saved choice if any, otherwise auto-detect from the
  // browser's preferred language (the incoming request). Initial render is `en`
  // (matching the static HTML), so there's no hydration mismatch — the swap only
  // happens here, before the browser paints.
  useIsoLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) {
        if (stored !== DEFAULT_LOCALE) setLocaleState(stored);
        return;
      }
      // No saved choice → detect from the browser's language(s), e.g. "fr-FR" → "fr".
      const nav =
        (navigator.languages && navigator.languages[0]) ||
        navigator.language ||
        "";
      const code = nav.slice(0, 2).toLowerCase();
      if (isLocale(code) && code !== DEFAULT_LOCALE) {
        setLocaleState(code);
      }
    } catch {
      /* localStorage/navigator unavailable — stay on the default locale */
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
