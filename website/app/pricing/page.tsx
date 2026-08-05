import type { Metadata } from "next";
import { REGISTER_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing — Kuza",
  description:
    "Pay for what you use: pick a vertical, add the modules you need, AI and marketplace included. Every business starts with a 14-day all-access trial.",
};

const steps = [
  {
    title: "Try everything, free",
    body: "Fourteen days, all modules, all access. Set up your real branches, your real stock, your real team.",
  },
  {
    title: "Keep what earns its keep",
    body: "Subscribe to your vertical and the shared modules you actually used. Nothing you don't need.",
  },
  {
    title: "Scale by usage",
    body: "Growing? Add branches and users as add-ons instead of jumping pricing tiers.",
  },
];

const composition = [
  { item: "Restaurant vertical", note: "POS, tables, QR menus, reservations", price: "₦25,000" },
  { item: "Website builder", note: "Drag-and-drop site + templates, linked to your store", price: "₦8,000" },
  { item: "Accounting", note: "Books, posting engine, reports", price: "₦12,000" },
  { item: "People & payroll", note: "Attendance, leave, payroll runs", price: "₦12,000" },
  { item: "Extra branch × 2", note: "Beyond the included branch", price: "₦10,000" },
  { item: "Kuza AI + Marketplace", note: "Copilot, agents, supplier network, wallet", price: "Included" },
];

const faqs = [
  {
    q: "What happens when my trial ends?",
    a: "Your account drops to read-only — nothing is deleted. Subscribe to the modules you want and you pick up exactly where you left off.",
  },
  {
    q: "Are the AI agents an extra cost?",
    a: "No. Kuza AI (Copilot and Agents) and the Marketplace are assists — they come included with any subscription rather than being billed on their own.",
  },
  {
    q: "Can I run both a shop and a restaurant?",
    a: "A business runs one vertical — Inventory, Restaurant or Storefront — as its primary surface. They all sell through the same stock core, and you can stack any shared module (Invoicing, Accounting, Payments, People, Website) on top.",
  },
  {
    q: "How do I pay?",
    a: "Through a secure in-app checkout. Paid features are only ever activated by a signature-verified payment confirmation — the same discipline Kuza applies to your own customers' payments.",
  },
  {
    q: "What currency will I pay in?",
    a: "Prices are local-first and set per currency. You'll see exact figures for your country in the app.",
  },
  {
    q: "Do my staff cost extra?",
    a: "Each plan includes a number of users; beyond that, extra users are a simple usage add-on — like extra branches.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-16 text-center md:px-8 lg:pt-20">
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-tight text-forest sm:text-5xl">
            Pay for what you use. Not for what you might.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            No bloated tiers. Pick the vertical that matches how you sell, add
            the shared modules you need, and get AI and the supplier network
            included.
          </p>
          <a
            href={REGISTER_URL}
            className="mt-8 inline-block rounded-full bg-leaf px-8 py-4 text-base font-semibold text-white shadow-lift transition-colors hover:bg-leaf-dark"
          >
            Start free — 14 days, all access
          </a>
          <p className="mt-4 text-sm text-muted">
            Every module unlocked during the trial. No tier decisions on day
            one.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8">
        <ol className="grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest font-display text-sm font-bold text-amber">
                {i + 1}
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-forest">
                {s.title}
              </h2>
              <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-5 py-20 md:px-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
              What a subscription looks like.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Here&apos;s a three-branch restaurant that runs its books and
              payroll on Kuza. Your mix will differ — that&apos;s the point.
            </p>
            <p className="mt-4 rounded-2xl border border-amber/40 bg-amber/10 px-5 py-4 text-[0.95rem] leading-relaxed text-ink">
              <strong>Illustrative figures.</strong> Actual prices are set per
              country and currency and shown in the app before you subscribe —
              they may be higher or lower than this example.
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
            <p className="font-display text-lg font-bold text-forest">
              Example: Mama Nkechi Kitchens — 3 branches
            </p>
            <ul className="mt-5 divide-y divide-line">
              {composition.map((c) => (
                <li
                  key={c.item}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <div>
                    <p className="font-semibold">{c.item}</p>
                    <p className="text-sm text-muted">{c.note}</p>
                  </div>
                  <p
                    className={`shrink-0 font-semibold tabular-nums ${
                      c.price === "Included" ? "text-leaf" : ""
                    }`}
                  >
                    {c.price}
                    {c.price !== "Included" && (
                      <span className="text-sm font-normal text-muted">
                        /mo
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t-2 border-forest pt-4">
              <p className="font-display text-lg font-bold">
                Illustrative total
              </p>
              <p className="font-display text-2xl font-bold text-forest tabular-nums">
                ₦59,000<span className="text-base font-medium text-muted">/mo</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-20 md:px-8">
        <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
          Questions owners actually ask.
        </h2>
        <dl className="mt-10 divide-y divide-line">
          {faqs.map((f) => (
            <div key={f.q} className="py-6">
              <dt className="font-display text-lg font-semibold">{f.q}</dt>
              <dd className="mt-2 max-w-2xl leading-relaxed text-muted">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8">
        <div className="rounded-3xl bg-forest-deep px-6 py-14 text-center text-white sm:px-12">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            The trial costs nothing. Running blind costs plenty.
          </h2>
          <a
            href={REGISTER_URL}
            className="mt-8 inline-block rounded-full bg-amber px-8 py-4 text-base font-semibold text-ink transition-colors hover:bg-white"
          >
            Start your free trial
          </a>
        </div>
      </section>
    </>
  );
}
