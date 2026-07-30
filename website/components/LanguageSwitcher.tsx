"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, useLocale, useT } from "@/lib/i18n";
import { Globe, ChevronDown, Check } from "./icons";

/*
 * Compact language switcher for the nav. A globe + the current language's
 * native name opens a small dropdown of the five supported languages. Styled to
 * match the nav (paper surface, blue `leaf` accent, rounded). The open/close
 * animation is defined in globals.css (`.lang-menu`) and disabled under
 * prefers-reduced-motion.
 */
export default function LanguageSwitcher({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menuAlign = variant === "mobile" ? "left-0" : "right-0";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.chooseLanguage")}
        className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-paper font-medium text-ink transition-colors hover:border-leaf/40 hover:text-leaf ${
          variant === "mobile"
            ? "w-full justify-between px-4 py-3 text-base"
            : "px-3 py-2 text-[0.95rem]"
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="text-leaf">
            <Globe width={17} height={17} />
          </span>
          {current.native}
        </span>
        <span
          className={`text-muted transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDown width={15} height={15} />
        </span>
      </button>

      {open && (
        <ul
          role="menu"
          className={`lang-menu absolute ${menuAlign} z-50 mt-2 min-w-[10rem] overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-lift ${
            variant === "mobile" ? "w-full" : ""
          }`}
        >
          {LOCALES.map((l) => {
            const active = l.code === locale;
            return (
              <li key={l.code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setLocale(l.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[0.95rem] font-medium transition-colors ${
                    active
                      ? "bg-mint text-leaf"
                      : "text-ink hover:bg-paper hover:text-leaf"
                  }`}
                >
                  {l.native}
                  {active && (
                    <span className="text-leaf">
                      <Check width={15} height={15} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
