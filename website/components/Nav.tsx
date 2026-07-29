"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LOGIN_URL, REGISTER_URL } from "@/lib/site";
import BrandMark from "./BrandMark";

const links = [
  { href: "/features", label: "Features" },
  { href: "/ai", label: "Kuza AI" },
  { href: "/industries", label: "Industries" },
  { href: "/pricing", label: "Pricing" },
];

function Wordmark() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2 transition-transform duration-300 hover:-translate-y-px"
      aria-label="Kuza home"
    >
      <BrandMark size={30} className="rounded-[9px]" />
      <span className="font-display text-xl font-bold tracking-tight text-forest">
        kuza
      </span>
    </Link>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    // Solid paper — the same color as the page background — and borderless, so
    // the header reads as one continuous surface with the page.
    <header className="sticky top-0 z-50 bg-paper">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        {/* Logo + menu, floated left together */}
        <div className="flex items-center gap-8">
          <Wordmark />
          <ul className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`text-[0.95rem] font-medium transition-colors hover:text-leaf ${
                    pathname === l.href ? "text-leaf" : "text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={LOGIN_URL}
            className="rounded-full px-4 py-2 text-[0.95rem] font-semibold text-forest transition-colors hover:bg-mint"
          >
            Log in
          </a>
          <a
            href={REGISTER_URL}
            className="group rounded-full bg-leaf px-5 py-2.5 text-[0.95rem] font-semibold text-white shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:bg-leaf-dark"
          >
            Start free
          </a>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <span
            className={`h-0.5 w-6 rounded bg-ink transition-transform ${
              open ? "translate-y-1 rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 rounded bg-ink transition-transform ${
              open ? "-translate-y-1 -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-paper px-5 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line py-3.5 text-base font-medium text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3">
            <a
              href={REGISTER_URL}
              className="rounded-full bg-leaf px-5 py-3 text-center font-semibold text-white"
            >
              Start free
            </a>
            <a
              href={LOGIN_URL}
              className="rounded-full border border-line px-5 py-3 text-center font-semibold text-forest"
            >
              Log in
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
