import Link from "next/link";
import HeroDemo from "@/components/HeroDemo";
import { LOGIN_URL, REGISTER_URL } from "@/lib/site";
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

/* ---------- Small in-page mockups (demo data, labeled) ---------- */

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

/* ---------- Data ---------- */

const channels = [
  { Icon: Whatsapp, t: "WhatsApp" },
  { Icon: Instagram, t: "Instagram" },
  { Icon: Chat, t: "Messenger" },
  { Icon: Telegram, t: "Telegram" },
  { Icon: Store, t: "Shop floor" },
  { Icon: Table, t: "The table" },
  { Icon: Fuel, t: "The pump" },
  { Icon: Tag, t: "Marketplace" },
];

const rippleSteps = [
  {
    title: "Stock allocated",
    body: "FIFO, LIFO or FEFO — your rule. Short at this branch? Kuza spills over to the next one.",
  },
  {
    title: "Batch traced",
    body: "Every line remembers which batch and supplier it came from, at what cost.",
  },
  {
    title: "Ledger appended",
    body: "One immutable row per movement, written in the same transaction as the sale.",
  },
  {
    title: "Books posted",
    body: "Revenue, tax, cost of goods — the double-entry journal writes itself.",
  },
  {
    title: "Dashboard updated",
    body: "Owners see it instantly. Nothing to re-key, nothing to reconcile at month-end.",
  },
];

const featureRows = [
  {
    id: "selling",
    eyebrow: null,
    title: "Sell wherever your customers are",
    body: "Your AI agent converses on WhatsApp, Instagram, Messenger and Telegram — quoting live stock, taking the order and checking payment against your rules. The counter, the table, the pump and the marketplace all flow into the same place.",
    points: ["One agent for every channel", "A DM becomes a real order — booked to your ledger"],
    href: "/ai",
    cta: "Meet Kuza Agents",
    visual: <ChatMock />,
    flip: false,
    bg: "bg-paper",
  },
  {
    id: "branches",
    eyebrow: null,
    title: "Every branch. One truth.",
    body: "Per-branch stock, prices and takings — with access that follows your org, not the other way round. Staff see only their branches, managers approve what arrives, owners see everything, everywhere.",
    points: [
      "Inter-branch transfers with a manager receive step — stock never vanishes in transit",
      "Short on stock? A sale spills over to the next branch automatically",
    ],
    href: "/features#stock",
    cta: "Explore inventory",
    visual: <TransferMock />,
    flip: true,
    bg: "bg-white",
  },
  {
    id: "accounting",
    eyebrow: null,
    title: "Books that write themselves.",
    body: "Every sale, goods receipt, invoice, customer payment and payroll run posts its own balanced journal entry — automatically, in the same transaction. Trial balance, P&L, balance sheet and general ledger, ready whenever you are.",
    points: ["No end-of-month heroics", "Books that can never drift from your stock"],
    href: "/features#accounting",
    cta: "Explore accounting",
    visual: <JournalMock />,
    flip: false,
    bg: "bg-paper",
  },
  {
    id: "copilot",
    eyebrow: null,
    title: "Ask your business anything.",
    body: "Kuza Copilot answers from your own data — sales, stock, payroll, books — across every branch or just one. The numbers are computed in code; the AI only explains them. It will never invent a figure.",
    points: ["Answers grounded in your real data", "General or branch-scoped, in plain language"],
    href: "/ai",
    cta: "Meet Kuza Copilot",
    visual: <CopilotMock />,
    flip: true,
    bg: "bg-white",
  },
];

const proofStats = [
  { n: "6", l: "ways to sell", s: "DMs · counter · table · pump · marketplace · invoice" },
  { n: "1", l: "source of truth", s: "stock, sales, books & people in one system" },
  { n: "0", l: "spreadsheets", s: "nothing to re-key, nothing to reconcile" },
  { n: "14", l: "day free trial", s: "all-access · no card to start" },
];

const modules = [
  { Icon: Inventory, t: "Inventory", d: "Batches, transfers, valuation and reorders across every branch." },
  { Icon: Restaurant, t: "Restaurant", d: "Orders, POS, tables, menu studio and a free QR menu." },
  { Icon: Invoice, t: "Invoicing", d: "Branded invoices and receivables that reconcile against payments." },
  { Icon: Accounting, t: "Accounting", d: "Double-entry books that write themselves from operations." },
  { Icon: People, t: "People & Payroll", d: "Staff, attendance, leave and payroll with tax — posted to your books." },
  { Icon: Payments, t: "Payments", d: "Bank transfer & virtual accounts, auto-reconciled. Card & mobile money on the roadmap." },
];

const industriesGrid = [
  { Icon: Restaurant, t: "Restaurants & hospitality", href: "/industries" },
  { Icon: Store, t: "Retail shops", href: "/industries" },
  { Icon: Truck, t: "Wholesale & distribution", href: "/industries" },
  { Icon: Briefcase, t: "Services", href: "/industries" },
  { Icon: Fuel, t: "Fuel stations", href: "/industries" },
  { Icon: Factory, t: "Manufacturing", href: "/industries" },
];

const plans = [
  {
    name: "Starter",
    tag: "A single shop, getting organised",
    price: "Free",
    per: "for 14 days · no card",
    pop: false,
    cta: "Start free",
    feats: [
      "One vertical (Inventory or Restaurant)",
      "POS + stock + receipts",
      "1 branch, 2 users",
      "Kuza AI Copilot",
    ],
  },
  {
    name: "Growth",
    tag: "Selling across channels",
    price: "À-la-carte",
    per: "pay per module",
    pop: true,
    cta: "Start free",
    feats: [
      "Everything in Starter",
      "Stack Invoicing, Accounting, People",
      "AI Agents on WhatsApp & Instagram",
      "Multi-branch stock & reports",
    ],
  },
  {
    name: "Scale",
    tag: "Multi-branch operations",
    price: "Talk to us",
    per: "volume pricing",
    pop: false,
    cta: "Book a demo",
    feats: [
      "Everything in Growth",
      "All channels + Marketplace",
      "Priority support & onboarding",
      "Custom rules & roles",
    ],
  },
];

const faqs = [
  {
    q: "What exactly is Kuza?",
    a: "An AI operating system for business: one ERP that runs your whole operation — stock, sales, money and people — with AI agents on the front line that take orders and check payment against your rules, then post everything to your books.",
  },
  {
    q: "How do the AI agents handle payments?",
    a: "You set the conditions. Every money-moving action is checked against your rules (amount, payer name, date) and fully audited. Today those actions land in your approval queue before anything moves; rule-based auto-clear of the safe ones is the direction we're building toward. Money only ever moves through idempotent, signature-verified paths.",
  },
  {
    q: "Which channels can agents sell on?",
    a: "WhatsApp, Instagram, Messenger, Telegram and web chat, using real Meta and Telegram connect flows — plus the shop floor, the table, the pump and the marketplace.",
  },
  {
    q: "Is everything really one system of record?",
    a: "Yes. Stock is a shared core: a sale deducts it, accounting sees it and the dashboard reflects it — automatically, in one database transaction, across every branch and channel.",
  },
  {
    q: "How much does it cost?",
    a: "Start with a free 14-day all-access trial. After that you pay à-la-carte — per vertical/common module plus usage — with the AI assists included. Prices shown are illustrative unless stated.",
  },
];

/* ---------- Page ---------- */

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-14 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div className="hero-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-leaf shadow-card">
              <Sparkle width={15} height={15} /> The AI operating system for business
            </span>
            <h1 className="mt-5 font-display text-[2.2rem] font-extrabold leading-[1.05] text-forest sm:text-[2.55rem] lg:text-[3rem]">
              Run your whole business — and let Kuza sell for you, wherever you sell.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Kuza keeps every branch on one source of truth — stock, sales,
              invoices, books, payroll — while AI agents answer your customers on
              WhatsApp and Instagram and turn conversations into orders your books
              already understand.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={REGISTER_URL}
                className="group inline-flex items-center gap-2 rounded-full bg-leaf px-7 py-3.5 text-base font-semibold text-white shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:bg-leaf-dark"
              >
                Start free — 14 days, all access{" "}
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
                See how it works
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-success">
                  <Check width={16} height={16} />
                </span>
                14-day free trial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-success">
                  <Check width={16} height={16} />
                </span>
                No card to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-success">
                  <Check width={16} height={16} />
                </span>
                Rules-based payments
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
            One platform, wherever your customers are
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {channels.map(({ Icon, t }) => (
              <li
                key={t}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-forest"
              >
                <span className="text-leaf">
                  <Icon width={16} height={16} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* THE RIPPLE */}
      <section id="one-sale" className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
            One sale updates everything. In one transaction.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Whether it&apos;s rung up at the counter or closed by an agent in a
            DM, a sale ripples through your whole operation the moment it happens —
            so your books can never drift from your stock.
          </p>
        </div>

        <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {rippleSteps.map((s, i) => (
            <li key={s.title} className="relative">
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
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
                {s.body}
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
                {f.title}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">{f.body}</p>
              <ul className="mt-6 space-y-3 text-[1.02rem]">
                {f.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span className="mt-1 shrink-0 text-leaf">
                      <Check width={18} height={18} />
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={f.href}
                className="mt-7 inline-flex items-center gap-1.5 font-semibold text-leaf underline decoration-amber decoration-2 underline-offset-4"
              >
                {f.cta} <ArrowR width={16} height={16} />
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
              <div key={s.l}>
                <p className="font-display text-5xl font-extrabold leading-none tabular-nums lg:text-6xl">
                  {s.n}
                </p>
                <p className="mt-3 font-display text-lg font-semibold">{s.l}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                  {s.s}
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
              Everything a real business runs on — in one app.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Pick the vertical that matches how you sell, then stack the shared
              modules your operation needs. No integrations to wire — they already
              share one stock core and one ledger.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ Icon, t, d }, i) => (
              <div
                key={t}
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
                    {t}
                  </h3>
                  <p className="relative mt-2 text-[0.95rem] leading-relaxed text-muted">
                    {d}
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
            Kuza AI and the supplier Marketplace are included with every plan —
            not sold separately.{" "}
            <Link
              href="/pricing"
              className="font-semibold text-leaf underline decoration-amber decoration-2 underline-offset-4"
            >
              See how pricing works
            </Link>
          </p>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
              Dressed for the trade it runs.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Restaurants, retail, wholesale, services, fuel and manufacturing —
              each gets its own scene and the specific jobs Kuza does for it, not
              a generic pitch.
            </p>
          </div>
          <Link
            href="/industries"
            className="rounded-full border border-forest px-6 py-3 font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
          >
            Explore industries
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industriesGrid.map(({ Icon, t, href }, i) => (
            <div
              key={t}
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
                  {t}
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
              Restock from suppliers without leaving your books.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Find suppliers on the Kuza network, place a purchase order, and watch
              it land in your stock and their invoice — both sides reconciled
              automatically. Pay instantly from your Kuza wallet or confirm a bank
              transfer.
            </p>
            <ul className="mt-6 space-y-3 text-[1.02rem]">
              <li className="flex gap-3">
                <span className="mt-1 shrink-0 text-leaf">
                  <Check width={18} height={18} />
                </span>
                One purchase order updates two businesses — yours and your
                supplier&apos;s.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 shrink-0 text-leaf">
                  <Check width={18} height={18} />
                </span>
                Wallet transfers are atomic and can never go negative.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 shrink-0 text-leaf">
                  <Check width={18} height={18} />
                </span>
                Partnership pricing, MOQs and bargaining — like the market, but
                accounted for.
              </li>
            </ul>
          </div>
          <PurchaseOrderMock />
        </div>
      </section>

      {/* PEOPLE / TRUST */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
            Built for the people who run real businesses.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            From the shop counter to the kitchen to the market stall — Kuza is
            made for the operators who keep Africa&apos;s businesses moving.
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
              Inventory, on the shop floor
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
              Taking orders across the counter
            </figcaption>
          </figure>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-forest sm:text-4xl">
              Simple, à-la-carte pricing.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Start free for 14 days with everything unlocked. Then pay only for
              the modules you use. Prices are illustrative.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border bg-white p-7 shadow-card ${
                  p.pop ? "border-2 border-leaf shadow-lift" : "border-line"
                }`}
              >
                {p.pop && (
                  <span className="absolute -top-3 left-7 rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-xl font-bold text-forest">
                  {p.name}
                </h3>
                <p className="mt-1 text-[0.95rem] text-muted">{p.tag}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-extrabold text-forest">
                    {p.price}
                  </span>
                  <span className="text-sm text-muted">{p.per}</span>
                </div>
                <a
                  href={REGISTER_URL}
                  className={`mt-6 inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                    p.pop
                      ? "bg-leaf text-white shadow-lift hover:bg-leaf-dark"
                      : "border border-forest text-forest hover:bg-forest hover:text-white"
                  }`}
                >
                  {p.cta} <ArrowR width={16} height={16} />
                </a>
                <ul className="mt-6 space-y-3 border-t border-line pt-6 text-[0.95rem]">
                  {p.feats.map((x) => (
                    <li key={x} className="flex gap-2.5">
                      <span className="mt-0.5 shrink-0 text-leaf">
                        <Check width={17} height={17} />
                      </span>
                      <span>{x}</span>
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
              Built like a payments company. Because your money is in here.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/75">
              Kuza treats every naira with the discipline of financial
              infrastructure — not the optimism of a spreadsheet.
            </p>
          </div>
          <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="font-display text-lg font-semibold text-amber">
                An immutable stock ledger
              </dt>
              <dd className="mt-2 leading-relaxed text-white/75">
                Every stock movement is one append-only row — written in the same
                database transaction as the change itself.
              </dd>
            </div>
            <div>
              <dt className="font-display text-lg font-semibold text-amber">
                Verified payments only
              </dt>
              <dd className="mt-2 leading-relaxed text-white/75">
                Bank transfers reconcile through signature-verified webhooks,
                idempotently. Nothing is marked paid on a screenshot.
              </dd>
            </div>
            <div>
              <dt className="font-display text-lg font-semibold text-amber">
                Rules-based payment verification
              </dt>
              <dd className="mt-2 leading-relaxed text-white/75">
                You set the conditions — amount, payer, date. Every money-moving
                action is checked against your rules and audited, with an approval
                queue for anything that needs a human.
              </dd>
            </div>
            <div>
              <dt className="font-display text-lg font-semibold text-amber">
                Access that follows your org
              </dt>
              <dd className="mt-2 leading-relaxed text-white/75">
                Branch-scoped permissions, custom roles, and 2FA gating on
                sensitive settlement changes.
              </dd>
            </div>
            <div>
              <dt className="font-display text-lg font-semibold text-amber">
                Your business, isolated
              </dt>
              <dd className="mt-2 leading-relaxed text-white/75">
                Every business lives in its own isolated database schema — your
                data never shares a table with anyone else&apos;s.
              </dd>
            </div>
            <div>
              <dt className="font-display text-lg font-semibold text-amber">
                Everything on the record
              </dt>
              <dd className="mt-2 leading-relaxed text-white/75">
                Audit logs across the platform, and a full action log for every
                AI conversation and tool call.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-20 md:px-8 lg:py-28">
        <h2 className="text-center font-display text-3xl font-bold text-forest sm:text-4xl">
          Questions, answered.
        </h2>
        <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-white shadow-card">
          {faqs.map((f, i) => (
            <details key={f.q} className="group px-6 py-5" {...(i === 0 ? { open: true } : {})}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-forest">
                {f.q}
                <span className="shrink-0 text-leaf transition-transform group-open:rotate-90">
                  <ArrowR width={18} height={18} />
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8 lg:pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center text-white sm:px-12 lg:py-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            Run the whole thing. Let Kuza sell for you.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85">
            Fourteen days, every module, all access. Then keep only what you use.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={REGISTER_URL}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-leaf shadow-lift transition-transform hover:scale-[1.02]"
            >
              Start your free trial{" "}
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
              Sign in
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
