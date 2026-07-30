"use client";

import Link from "next/link";
import HeroDemo from "@/components/HeroDemo";
import { LOGIN_URL, REGISTER_URL } from "@/lib/site";
import { useT } from "@/lib/i18n";
import {
  ArrowR,
  Check,
  Sparkle,
  Whatsapp,
  Instagram,
  Telegram,
  Chat,
  Copilot,
  Inventory,
  Restaurant,
  Invoice,
  Accounting,
  People,
  Payments,
  Store,
  Truck,
  Briefcase,
  Tag,
  Fuel,
  Factory,
  Table,
} from "@/components/icons";

/* ---------- Small in-page mockups (demo data, labeled) ----------
   These render illustrative product-UI with demo data (order IDs, figures,
   sample account names). They stand in for real product screenshots and are
   intentionally left in English. */

function ChatMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-2.5 border-b border-line pb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-white">
          <Whatsapp width={17} height={17} />
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">Amara · Kuza Agent</p>
          <p className="text-xs text-muted">WhatsApp · Amara&apos;s Kitchen</p>
        </div>
        <span className="ml-auto rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-leaf">
          Online
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2.5 text-[0.9rem] leading-snug">
        <p className="max-w-[82%] self-start rounded-2xl rounded-bl-md bg-paper px-3.5 py-2.5">
          Hi! 2× Jollof + chicken for two? 🍗
        </p>
        <p className="max-w-[82%] self-end rounded-2xl rounded-br-md bg-leaf px-3.5 py-2.5 text-white">
          That&apos;s ₦9,600 + ₦1,500 delivery. Shall I place it?
        </p>
        <p className="max-w-[82%] self-start rounded-2xl rounded-bl-md bg-paper px-3.5 py-2.5">
          Yes please 🙌
        </p>
        <span className="mt-1 inline-flex items-center gap-1.5 self-center rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
          <Check width={13} height={13} /> Payment checked against your rules · order booked
        </span>
      </div>
      <p className="mt-4 text-xs text-muted">Demo conversation · illustrative figures</p>
    </div>
  );
}

function JournalMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Journal entry · JE-0384</p>
        <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-leaf">
          Posted automatically
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Source: POS sale KD-1042 · Surulere branch
      </p>
      <table className="mt-4 w-full text-[0.85rem]">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="pb-2 font-medium">Account</th>
            <th className="pb-2 text-right font-medium">Debit</th>
            <th className="pb-2 text-right font-medium">Credit</th>
          </tr>
        </thead>
        <tbody className="font-medium">
          <tr className="border-b border-line/60">
            <td className="py-2">Cash</td>
            <td className="py-2 text-right tabular-nums">₦85,000</td>
            <td className="py-2 text-right tabular-nums text-muted">—</td>
          </tr>
          <tr className="border-b border-line/60">
            <td className="py-2">Sales revenue</td>
            <td className="py-2 text-right tabular-nums text-muted">—</td>
            <td className="py-2 text-right tabular-nums">₦85,000</td>
          </tr>
          <tr className="border-b border-line/60">
            <td className="py-2">Cost of goods sold</td>
            <td className="py-2 text-right tabular-nums">₦61,400</td>
            <td className="py-2 text-right tabular-nums text-muted">—</td>
          </tr>
          <tr>
            <td className="py-2">Inventory</td>
            <td className="py-2 text-right tabular-nums text-muted">—</td>
            <td className="py-2 text-right tabular-nums">₦61,400</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">Illustrative figures</p>
    </div>
  );
}

function CopilotMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-leaf">
          <Copilot width={18} height={18} />
        </span>
        Kuza Copilot
      </p>
      <div className="mt-4 space-y-3 text-[0.9rem] leading-relaxed">
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-paper px-4 py-3">
          Can I afford to hire another employee at the Ikeja branch?
        </p>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line px-4 py-3">
          <p>
            Ikeja cleared <strong>₦2.4m in profit</strong> over the last 90 days
            after payroll of ₦1.1m. A new hire at your current junior salary band
            (₦180k/month) keeps the branch profitable in every one of those
            months.
          </p>
          <p className="mt-2 text-xs text-muted">
            Computed from your sales, payroll and books — Copilot never invents
            figures. Illustrative data.
          </p>
        </div>
      </div>
    </div>
  );
}

function TransferMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Inter-branch transfer · TR-0092</p>
        <span className="rounded-full bg-amber/20 px-2.5 py-1 text-xs font-semibold text-amber-deep">
          Awaiting receipt
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3 text-[0.9rem] font-medium">
        <span className="rounded-xl bg-paper px-3.5 py-2.5">Yaba</span>
        <span aria-hidden="true" className="text-muted">
          →
        </span>
        <span className="rounded-xl bg-paper px-3.5 py-2.5">Surulere</span>
        <span className="ml-auto text-muted">24 items</span>
      </div>
      <ul className="mt-4 space-y-2 border-t border-line pt-3 text-[0.85rem]">
        <li className="flex justify-between">
          <span className="text-muted">Peak milk 400g</span>
          <span className="font-medium tabular-nums">× 12</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted">Golden Penny semovita 1kg</span>
          <span className="font-medium tabular-nums">× 8</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted">Malt 33cl crate</span>
          <span className="font-medium tabular-nums">× 4</span>
        </li>
      </ul>
      <p className="mt-4 rounded-xl bg-paper px-3.5 py-2.5 text-[0.85rem] text-muted">
        The Surulere manager confirms receipt before stock moves — every unit
        stays accounted for. Illustrative data.
      </p>
    </div>
  );
}

function PurchaseOrderMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Purchase order · PO-1180</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
          <Check width={13} height={13} /> Paid from wallet
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3 text-[0.9rem] font-medium">
        <span className="rounded-xl bg-paper px-3.5 py-2.5">Mama Nkechi Stores</span>
        <span aria-hidden="true" className="text-muted">
          →
        </span>
        <span className="rounded-xl bg-paper px-3.5 py-2.5">Lagos Beverages Ltd</span>
      </div>
      <ul className="mt-4 space-y-2 border-t border-line pt-3 text-[0.85rem]">
        <li className="flex justify-between">
          <span className="text-muted">Buyer · goods received</span>
          <span className="font-medium">+120 units to stock</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted">Supplier · invoice raised</span>
          <span className="font-medium tabular-nums">₦342,000</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted">Wallet transfer</span>
          <span className="font-medium text-leaf">Atomic · never negative</span>
        </li>
      </ul>
      <p className="mt-4 text-xs text-muted">
        One order updates both businesses. Illustrative data.
      </p>
    </div>
  );
}

/* ---------- Data (keys resolved via t() at render) ---------- */

// Brand-named channels keep their literal label; the rest translate.
const channels: { Icon: typeof Whatsapp; label?: string; key?: string }[] = [
  { Icon: Whatsapp, label: "WhatsApp" },
  { Icon: Instagram, label: "Instagram" },
  { Icon: Chat, label: "Messenger" },
  { Icon: Telegram, label: "Telegram" },
  { Icon: Store, key: "home.channels.shopFloor" },
  { Icon: Table, key: "home.channels.table" },
  { Icon: Fuel, key: "home.channels.pump" },
  { Icon: Tag, key: "home.channels.marketplace" },
];

const rippleSteps = ["step1", "step2", "step3", "step4", "step5"];

const featureRows = [
  { id: "selling", href: "/ai", visual: <ChatMock />, flip: false, bg: "bg-paper" },
  { id: "branches", href: "/features#stock", visual: <TransferMock />, flip: true, bg: "bg-white" },
  { id: "accounting", href: "/features#accounting", visual: <JournalMock />, flip: false, bg: "bg-paper" },
  { id: "copilot", href: "/ai", visual: <CopilotMock />, flip: true, bg: "bg-white" },
];

const proofStats = [
  { n: "6", base: "stat1" },
  { n: "1", base: "stat2" },
  { n: "0", base: "stat3" },
  { n: "14", base: "stat4" },
];

const modules = [
  { Icon: Inventory, base: "inventory" },
  { Icon: Restaurant, base: "restaurant" },
  { Icon: Invoice, base: "invoicing" },
  { Icon: Accounting, base: "accounting" },
  { Icon: People, base: "people" },
  { Icon: Payments, base: "payments" },
];

const industriesGrid = [
  { Icon: Restaurant, key: "home.industries.restaurants", href: "/industries" },
  { Icon: Store, key: "home.industries.retail", href: "/industries" },
  { Icon: Truck, key: "home.industries.wholesale", href: "/industries" },
  { Icon: Briefcase, key: "home.industries.services", href: "/industries" },
  { Icon: Fuel, key: "home.industries.fuel", href: "/industries" },
  { Icon: Factory, key: "home.industries.manufacturing", href: "/industries" },
];

const plans = [
  { base: "starter", pop: false, feats: ["feat1", "feat2", "feat3", "feat4"] },
  { base: "growth", pop: true, feats: ["feat1", "feat2", "feat3", "feat4"] },
  { base: "scale", pop: false, feats: ["feat1", "feat2", "feat3", "feat4"] },
];

const faqs = ["q1", "q2", "q3", "q4", "q5"];

/* ---------- Page ---------- */

export default function Home() {
  const t = useT();

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-14 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div className="hero-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-leaf shadow-card">
              <Sparkle width={15} height={15} /> {t("home.hero.badge")}
            </span>
            <h1 className="mt-5 font-display text-[2.2rem] font-extrabold leading-[1.05] text-forest sm:text-[2.55rem] lg:text-[3rem]">
              {t("home.hero.title")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {t("home.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={REGISTER_URL}
                className="group inline-flex items-center gap-2 rounded-full bg-leaf px-7 py-3.5 text-base font-semibold text-white shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:bg-leaf-dark"
              >
                {t("home.hero.ctaPrimary")}{" "}
                <ArrowR
                  width={18}
                  height={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </a>
              <a
                href="#one-sale"
                className="text-base font-semibold text-forest underline decoration-amber decoration-2 underline-offset-4 transition-colors hover:text-leaf"
              >
                {t("home.hero.ctaSecondary")}
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-success">
                  <Check width={16} height={16} />
                </span>
                {t("home.hero.trust1")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-success">
                  <Check width={16} height={16} />
                </span>
                {t("home.hero.trust2")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-success">
                  <Check width={16} height={16} />
                </span>
                {t("home.hero.trust3")}
              </span>
            </div>
          </div>
          <HeroDemo />
        </div>
      </section>

      {/* CHANNELS STRIP */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-muted">
            {t("home.channels.heading")}
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {channels.map(({ Icon, label, key }) => (
              <li
                key={label ?? key}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-forest"
              >
                <span className="text-leaf">
                  <Icon width={16} height={16} />
                </span>
                {label ?? t(key as string)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* THE RIPPLE */}
      <section id="one-sale" className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
            {t("home.ripple.title")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            {t("home.ripple.body")}
          </p>
        </div>

        <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {rippleSteps.map((step, i) => (
            <li key={step} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest font-display text-sm font-bold text-amber">
                  {i + 1}
                </span>
                {i < rippleSteps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden h-px flex-1 bg-line lg:block"
                  />
                )}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                {t(`home.ripple.${step}.title`)}
              </h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
                {t(`home.ripple.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ALTERNATING FEATURE ROWS */}
      {featureRows.map((f) => (
        <section key={f.id} id={f.id} className={f.bg}>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2 lg:py-28">
            <div className={f.flip ? "lg:order-2" : undefined}>
              <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
                {t(`home.feature.${f.id}.title`)}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                {t(`home.feature.${f.id}.body`)}
              </p>
              <ul className="mt-6 space-y-3 text-[1.02rem]">
                {["point1", "point2"].map((pt) => (
                  <li key={pt} className="flex gap-3">
                    <span className="mt-1 shrink-0 text-leaf">
                      <Check width={18} height={18} />
                    </span>
                    <span>{t(`home.feature.${f.id}.${pt}`)}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={f.href}
                className="mt-7 inline-flex items-center gap-1.5 font-semibold text-leaf underline decoration-amber decoration-2 underline-offset-4"
              >
                {t(`home.feature.${f.id}.cta`)} <ArrowR width={16} height={16} />
              </Link>
            </div>
            <div className={f.flip ? "lg:order-1" : undefined}>{f.visual}</div>
          </div>
        </section>
      ))}

      {/* PROOF BAND — honest numerals only */}
      <section className="bg-brand-gradient text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 lg:py-20">
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {proofStats.map((s) => (
              <div key={s.base}>
                <p className="font-display text-5xl font-extrabold leading-none tabular-nums lg:text-6xl">
                  {s.n}
                </p>
                <p className="mt-3 font-display text-lg font-semibold">
                  {t(`home.proof.${s.base}.label`)}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                  {t(`home.proof.${s.base}.sub`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
              {t("home.modules.title")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {t("home.modules.body")}
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ Icon, base }, i) => (
              <div
                key={base}
                className="stagger-child"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <div className="card-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-card hover:border-leaf/30 hover:shadow-lift">
                  {/* soft blue glow that warms up on hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-mint opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-mint text-leaf ring-1 ring-inset ring-leaf/10 transition-all duration-300 group-hover:bg-leaf group-hover:text-white group-hover:ring-transparent">
                    <Icon width={22} height={22} />
                  </span>
                  <h3 className="relative mt-5 font-display text-lg font-semibold text-forest">
                    {t(`home.modules.${base}.title`)}
                  </h3>
                  <p className="relative mt-2 text-[0.95rem] leading-relaxed text-muted">
                    {t(`home.modules.${base}.desc`)}
                  </p>
                  {/* thin brand rule that draws in on hover */}
                  <span
                    aria-hidden="true"
                    className="mt-auto h-px w-8 rounded-full bg-gradient-to-r from-leaf to-transparent opacity-40 transition-all duration-300 group-hover:w-16 group-hover:opacity-100"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[0.95rem] text-muted">
            {t("home.modules.footnote.pre")}{" "}
            <Link
              href="/pricing"
              className="font-semibold text-leaf underline decoration-amber decoration-2 underline-offset-4"
            >
              {t("home.modules.footnote.link")}
            </Link>
          </p>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
              {t("home.industries.title")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {t("home.industries.body")}
            </p>
          </div>
          <Link
            href="/industries"
            className="rounded-full border border-forest px-6 py-3 font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
          >
            {t("home.industries.cta")}
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industriesGrid.map(({ Icon, key, href }, i) => (
            <div
              key={key}
              className="stagger-child"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <Link
                href={href}
                className="card-lift group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card hover:border-leaf/30 hover:shadow-lift"
              >
                {/* left brand bar that grows on hover */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1 bg-brand-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-white text-leaf ring-1 ring-inset ring-leaf/10 transition-all duration-300 group-hover:from-leaf group-hover:to-leaf-dark group-hover:text-white group-hover:ring-transparent">
                  <Icon
                    width={24}
                    height={24}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                </span>
                <span className="font-display text-[1.05rem] font-semibold leading-snug text-forest">
                  {t(key)}
                </span>
                <span className="ml-auto shrink-0 text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-leaf">
                  <ArrowR width={18} height={18} />
                </span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* MARKETPLACE */}
      <section className="bg-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-2 lg:py-28">
          <div>
            <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
              {t("home.marketplace.title")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {t("home.marketplace.body")}
            </p>
            <ul className="mt-6 space-y-3 text-[1.02rem]">
              {["point1", "point2", "point3"].map((pt) => (
                <li key={pt} className="flex gap-3">
                  <span className="mt-1 shrink-0 text-leaf">
                    <Check width={18} height={18} />
                  </span>
                  {t(`home.marketplace.${pt}`)}
                </li>
              ))}
            </ul>
          </div>
          <PurchaseOrderMock />
        </div>
      </section>

      {/* PEOPLE / TRUST */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
            {t("home.people.title")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            {t("home.people.body")}
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <figure className="overflow-hidden rounded-2xl border border-line shadow-card">
            <img
              src="/images/owner-laptop.jpg"
              alt="Shop owner taking stock on a laptop"
              loading="lazy"
              width={1000}
              height={667}
              className="h-72 w-full object-cover"
            />
            <figcaption className="bg-white px-5 py-4 text-[0.95rem] font-medium text-forest">
              {t("home.people.caption1")}
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-2xl border border-line shadow-card">
            <img
              src="/images/owner-beauty.jpg"
              alt="Beauty shop owner taking an order by phone"
              loading="lazy"
              width={1000}
              height={666}
              className="h-72 w-full object-cover"
            />
            <figcaption className="bg-white px-5 py-4 text-[0.95rem] font-medium text-forest">
              {t("home.people.caption2")}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
              {t("home.pricing.title")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              {t("home.pricing.body")}
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.base}
                className={`relative flex flex-col rounded-2xl border bg-white p-7 shadow-card ${
                  p.pop ? "border-2 border-leaf shadow-lift" : "border-line"
                }`}
              >
                {p.pop && (
                  <span className="absolute -top-3 left-7 rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-white">
                    {t("home.pricing.popular")}
                  </span>
                )}
                <h3 className="font-display text-xl font-bold text-forest">
                  {t(`home.pricing.${p.base}.name`)}
                </h3>
                <p className="mt-1 text-[0.95rem] text-muted">
                  {t(`home.pricing.${p.base}.tag`)}
                </p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-extrabold text-forest">
                    {t(`home.pricing.${p.base}.price`)}
                  </span>
                  <span className="text-sm text-muted">
                    {t(`home.pricing.${p.base}.per`)}
                  </span>
                </div>
                <a
                  href={REGISTER_URL}
                  className={`mt-6 inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                    p.pop
                      ? "bg-leaf text-white shadow-lift hover:bg-leaf-dark"
                      : "border border-forest text-forest hover:bg-forest hover:text-white"
                  }`}
                >
                  {t(`home.pricing.${p.base}.cta`)} <ArrowR width={16} height={16} />
                </a>
                <ul className="mt-6 space-y-3 border-t border-line pt-6 text-[0.95rem]">
                  {p.feats.map((feat) => (
                    <li key={feat} className="flex gap-2.5">
                      <span className="mt-0.5 shrink-0 text-leaf">
                        <Check width={17} height={17} />
                      </span>
                      <span>{t(`home.pricing.${p.base}.${feat}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENGINEERING TRUST */}
      <section className="bg-forest-deep text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              {t("home.trust.title")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/75">
              {t("home.trust.body")}
            </p>
          </div>
          <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {["item1", "item2", "item3", "item4", "item5", "item6"].map((item) => (
              <div key={item}>
                <dt className="font-display text-lg font-semibold text-amber">
                  {t(`home.trust.${item}.title`)}
                </dt>
                <dd className="mt-2 leading-relaxed text-white/75">
                  {t(`home.trust.${item}.body`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-20 md:px-8 lg:py-28">
        <h2 className="text-center font-display text-3xl font-bold text-forest sm:text-4xl">
          {t("home.faq.title")}
        </h2>
        <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-white shadow-card">
          {faqs.map((q, i) => (
            <details key={q} className="group px-6 py-5" {...(i === 0 ? { open: true } : {})}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-forest">
                {t(`home.faq.${q}`)}
                <span className="shrink-0 text-leaf transition-transform group-open:rotate-90">
                  <ArrowR width={18} height={18} />
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">
                {t(`home.faq.${q.replace("q", "a")}`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8 lg:pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white sm:px-12 lg:py-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            {t("home.finalCta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85">
            {t("home.finalCta.body")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={REGISTER_URL}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-leaf shadow-lift transition-transform hover:scale-[1.02]"
            >
              {t("home.finalCta.primary")}{" "}
              <ArrowR
                width={18}
                height={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </a>
            <a
              href={LOGIN_URL}
              className="text-base font-semibold text-white underline decoration-white/50 decoration-2 underline-offset-4 transition-colors hover:decoration-white"
            >
              {t("home.finalCta.secondary")}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
