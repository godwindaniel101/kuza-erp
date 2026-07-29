import Link from "next/link";
import { LOGIN_URL, REGISTER_URL } from "@/lib/site";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/ai", label: "Kuza Copilot & Agents" },
      { href: "/industries", label: "Industries" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Modules",
    links: [
      { href: "/features#stock", label: "Inventory & stock" },
      { href: "/features#selling", label: "POS & selling" },
      { href: "/features#invoicing", label: "Invoicing" },
      { href: "/features#accounting", label: "Accounting" },
      { href: "/features#people", label: "People & payroll" },
      { href: "/features#marketplace", label: "Marketplace & wallet" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: REGISTER_URL, label: "Start free trial", external: true },
      { href: LOGIN_URL, label: "Log in", external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-forest-deep text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="Kuza home" className="inline-block">
              {/* light logo for the dark footer */}
              <img
                src="/images/logos/kuza_logo_horizontal_dark_blue.svg"
                alt="Kuza"
                width={104}
                height={39}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-xs text-[0.95rem] leading-relaxed text-white/70">
              The AI operating system that runs your business and sells for you.
              Built for how African businesses actually operate.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-display text-sm font-semibold text-amber">
                {col.title}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"external" in l && l.external ? (
                      <a
                        href={l.href}
                        className="text-[0.95rem] text-white/80 transition-colors hover:text-white"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-[0.95rem] text-white/80 transition-colors hover:text-white"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Kuza. All rights reserved.</p>
          <p>Free 14-day all-access trial · then pay only for what you use.</p>
        </div>
      </div>
    </footer>
  );
}
