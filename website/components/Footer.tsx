"use client";

import Link from "next/link";
import { LOGIN_URL, REGISTER_URL } from "@/lib/site";
import { useT } from "@/lib/i18n";
import BrandMark from "./BrandMark";

const columns = [
  {
    titleKey: "footer.col.product",
    links: [
      { href: "/features", key: "footer.link.features" },
      { href: "/ai", key: "footer.link.copilotAgents" },
      { href: "/industries", key: "footer.link.industries" },
      { href: "/pricing", key: "footer.link.pricing" },
    ],
  },
  {
    titleKey: "footer.col.modules",
    links: [
      { href: "/features#stock", key: "footer.link.inventory" },
      { href: "/features#selling", key: "footer.link.pos" },
      { href: "/features#invoicing", key: "footer.link.invoicing" },
      { href: "/features#accounting", key: "footer.link.accounting" },
      { href: "/features#people", key: "footer.link.people" },
      { href: "/features#marketplace", key: "footer.link.marketplace" },
    ],
  },
  {
    titleKey: "footer.col.getStarted",
    links: [
      { href: REGISTER_URL, key: "footer.link.startTrial", external: true },
      { href: LOGIN_URL, key: "footer.link.login", external: true },
    ],
  },
];

export default function Footer() {
  const t = useT();

  return (
    <footer className="bg-forest-deep text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              aria-label="Kuza home"
              className="inline-flex items-center gap-2"
            >
              <BrandMark size={32} className="rounded-[10px]" />
              <span className="font-display text-2xl font-bold tracking-tight text-white">
                kuza
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[0.95rem] leading-relaxed text-white/70">
              {t("footer.tagline")}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.titleKey}>
              <p className="font-display text-sm font-semibold text-amber">
                {t(col.titleKey)}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.key}>
                    {"external" in l && l.external ? (
                      <a
                        href={l.href}
                        className="text-[0.95rem] text-white/80 transition-colors hover:text-white"
                      >
                        {t(l.key)}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-[0.95rem] text-white/80 transition-colors hover:text-white"
                      >
                        {t(l.key)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Kuza. {t("footer.rights")}
          </p>
          <p>{t("footer.trialLine")}</p>
        </div>
      </div>
    </footer>
  );
}
