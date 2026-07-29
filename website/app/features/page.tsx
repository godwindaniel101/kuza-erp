import type { Metadata } from "next";
import Link from "next/link";
import { REGISTER_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Features — Kuza",
  description:
    "The full Kuza catalog: stock, POS, invoicing, payments, marketplace, accounting, people and the platform underneath — module by module, honestly.",
};

type Feature = { name: string; body: string; flag?: string };

type Module = {
  id: string;
  nav: string;
  title: string;
  lead: string;
  features: Feature[];
};

const modules: Module[] = [
  {
    id: "stock",
    nav: "Inventory",
    title: "Inventory & stock — the shared core",
    lead: "One stock truth that every other module reads. Whether you run shops or kitchens, everything sells through it.",
    features: [
      {
        name: "Catalog that matches your shelf",
        body: "Barcodes, cost and sale prices, min/max levels, images, categories and subcategories, units of measure with conversions.",
      },
      {
        name: "Goods-in with cost batches",
        body: "Record inflows with supplier, invoice number, cost and currency — approval-gated — creating FIFO/FEFO cost batches with expiry dates.",
      },
      {
        name: "Bill of materials",
        body: "Sell a made-up item — a meal, a hamper, an assembled product — and Kuza depletes each component automatically.",
      },
      {
        name: "The immutable stock ledger",
        body: "One append-only row per movement, written in the same transaction as the change, plus a reconciliation report to prove it.",
      },
      {
        name: "Adjustments & write-offs",
        body: "Reason-coded, approval-gated and row-locked — shrinkage gets recorded, not buried.",
      },
      {
        name: "Worklists that watch your shelves",
        body: "Low-stock, out-of-stock and expiring-soon lists per branch, plus CSV bulk upload with a full log.",
      },
      {
        name: "Inventory AI",
        body: "Demand prediction, reorder suggestions, inventory health and sales forecasts from your own history.",
      },
    ],
  },
  {
    id: "selling",
    nav: "Selling",
    title: "POS & selling",
    lead: "The order engine both verticals share — counter sales, table service and agent-drafted orders all take the same path.",
    features: [
      {
        name: "Live sale in one transaction",
        body: "Allocate stock by your rule (FIFO/LIFO/FEFO) with multi-branch spillover, trace batch costs, compute profit and post the sale — atomically.",
      },
      {
        name: "Pending sale → fulfilment",
        body: "Take an order without touching stock, then fulfil it later — row-locked, idempotent, posting to receivables. It's the same bridge marketplace and AI orders use.",
      },
      {
        name: "Tables, QR menus & reservations",
        body: "Dine-in tables with capacity and QR codes, a public booking page, and a published menu site with six templates and your brand colors.",
      },
      {
        name: "Order lifecycle",
        body: "Mark paid with method and mode, edit, void — with diagnostics when something looks off.",
      },
    ],
  },
  {
    id: "invoicing",
    nav: "Invoicing",
    title: "Invoicing & receivables",
    lead: "Numbered, branded invoices that post to your books and chase themselves into your receivables.",
    features: [
      {
        name: "Invoices your customers recognize",
        body: "Your logo, accent color, template, tax setup, payment terms, bank details and footer — white-label to the last line.",
      },
      {
        name: "Send, record, settle",
        body: "Email delivery with your sender and reply-to, record part or full payments, void with a trail. Order-managed invoices settle through the order flow.",
      },
      {
        name: "Customers & credit",
        body: "Credit limits, tax IDs and an accounts-receivable view of who owes what.",
      },
      {
        name: "Pay-by-link page",
        body: "A hosted payment page for each invoice.",
        flag: "On the roadmap — not yet live.",
      },
    ],
  },
  {
    id: "payments",
    nav: "Payments",
    title: "Payments & reconciliation",
    lead: "Money is collected and reconciled at the edges — verified, idempotent, never on trust.",
    features: [
      {
        name: "Bank transfer that confirms itself",
        body: "Enable transfers and each branch gets a dedicated virtual account. The POS opens an awaiting payment; a signature-verified webhook matches the transfer and marks the order paid.",
      },
      {
        name: "Payment methods per branch",
        body: "Cash and bank transfer today, configured branch by branch.",
      },
      {
        name: "Card, mobile money & USSD",
        body: "Additional collection channels for every way your customers pay.",
        flag: "Defined in Kuza but not yet live — coming in a later phase.",
      },
      {
        name: "Settlement configuration",
        body: "Where your money lands — gated behind two-factor authentication, always.",
      },
      {
        name: "A full transaction ledger",
        body: "Every payment event on the record, reconciled to its order.",
      },
    ],
  },
  {
    id: "marketplace",
    nav: "Marketplace",
    title: "Marketplace, suppliers & wallet",
    lead: "A B2B network inside Kuza: find suppliers, order stock, and settle instantly — both businesses' books updated in one flow.",
    features: [
      {
        name: "Supplier directory & partnerships",
        body: "Search the network, request or invite partnerships; accepting one sets the buyer up in the supplier's receivables automatically.",
      },
      {
        name: "Catalog listings with real terms",
        body: "Prices, minimum order quantities, availability and bargain-allowed flags — visible to partners or the whole network, your choice.",
      },
      {
        name: "Purchase orders with a full lifecycle",
        body: "Draft → submit → accept → ship → receive → pay → confirm. The supplier's stock debits, your inflow lands, and the invoice writes itself.",
      },
      {
        name: "The Kuza wallet",
        body: "An internal ledger wallet with append-only entries and atomic, idempotent transfers. It can never go negative — by construction.",
      },
    ],
  },
  {
    id: "accounting",
    nav: "Accounting",
    title: "Accounting & reports",
    lead: "Double-entry books that keep themselves — because they're written by the same transactions that move your stock and money.",
    features: [
      {
        name: "A chart of accounts that fits",
        body: "Typed, hierarchical accounts with normal balances and protected system accounts.",
      },
      {
        name: "A posting engine, not a data-entry job",
        body: "Sales, goods receipts, adjustments, invoices, customer payments and payroll runs each post their own balanced journal entry — idempotently.",
      },
      {
        name: "Journal control when you need it",
        body: "Draft, post and reverse entries with a full trail.",
      },
      {
        name: "The reports your accountant asks for",
        body: "Trial balance, general ledger, profit & loss and balance sheet — current the moment anything happens.",
      },
    ],
  },
  {
    id: "people",
    nav: "People",
    title: "People, HR & payroll",
    lead: "From the org chart to the pay stub — and the payroll run posts straight to your books.",
    features: [
      {
        name: "Your whole team, structured",
        body: "Employees, departments, positions, locations and an org chart, with employee self-service.",
      },
      {
        name: "Attendance & leave",
        body: "Clock in/out, timesheets with approval, leave types, balances and a request/approve flow.",
      },
      {
        name: "Payroll with tax done right",
        body: "Approve runs, process payment and generate pay stubs — with tax calculated from your configuration and each employee's tax info.",
      },
      {
        name: "Grow your people",
        body: "Compensation structures, benefits, performance reviews and goals, learning courses, and recruitment with postings and applications.",
      },
    ],
  },
  {
    id: "platform",
    nav: "Platform",
    title: "The platform underneath",
    lead: "The unglamorous parts that make everything else trustworthy.",
    features: [
      {
        name: "Branch-scoped access, everywhere",
        body: "Admins see all branches; everyone else sees exactly the branches they're assigned — enforced on every list, dashboard and report.",
      },
      {
        name: "Roles, permissions & 2FA",
        body: "Custom roles over a permission catalog, team invitations, and TOTP two-factor that gates sensitive settlement changes.",
      },
      {
        name: "Dashboards & digests",
        body: "Branch-scoped KPIs per surface and an insights digest that tells you what changed.",
      },
      {
        name: "Notifications & audit logs",
        body: "Email plus an in-app inbox, and audit trails across the platform.",
      },
      {
        name: "Billing you control",
        body: "Per-module and usage pricing, app toggles and upgrade requests — paid activation only ever happens through a signature-verified payment webhook.",
      },
      {
        name: "Isolated by architecture",
        body: "Each business is its own database schema. One login, complete separation.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:px-8 lg:pt-20">
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight text-forest sm:text-5xl">
            Everything a real operation needs. Nothing bolted on.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Every module below reads and writes the same truth — one stock
            core, one order engine, one set of books. Here&apos;s the whole
            catalog, including what&apos;s still on the roadmap.
          </p>
          <nav aria-label="Modules" className="mt-8 flex flex-wrap gap-2.5">
            {modules.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-forest transition-colors hover:border-leaf hover:text-leaf"
              >
                {m.nav}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {modules.map((m, i) => (
          <section
            key={m.id}
            id={m.id}
            className={`scroll-mt-24 py-16 lg:py-20 ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
              <div>
                <h2 className="font-display text-2xl font-bold text-forest sm:text-3xl">
                  {m.title}
                </h2>
                <p className="mt-3 text-lg leading-relaxed text-muted">
                  {m.lead}
                </p>
              </div>
              <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                {m.features.map((f) => (
                  <div key={f.name}>
                    <dt className="font-display text-[1.05rem] font-semibold">
                      {f.name}
                    </dt>
                    <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">
                      {f.body}
                      {f.flag && (
                        <span className="mt-2 block w-fit rounded-full bg-amber/20 px-3 py-1 text-xs font-semibold text-amber-deep">
                          {f.flag}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        ))}
      </div>

      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8">
        <div className="rounded-3xl bg-forest-deep px-6 py-14 text-center text-white sm:px-12">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            Try all of it, free, for 14 days.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
            Every module unlocked from day one. Keep what earns its keep.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={REGISTER_URL}
              className="rounded-full bg-amber px-8 py-4 text-base font-semibold text-ink transition-colors hover:bg-white"
            >
              Start your free trial
            </a>
            <Link
              href="/pricing"
              className="font-semibold text-white underline decoration-amber decoration-2 underline-offset-4"
            >
              How pricing works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
