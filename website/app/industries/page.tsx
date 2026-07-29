import type { Metadata } from "next";
import { REGISTER_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Industries — Kuza",
  description:
    "Restaurants, retail, wholesale, services, fuel stations, manufacturing — Kuza gives each trade its own scene on one shared operating core.",
};

function MenuMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-bold">Table 6 · QR menu</p>
        <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-leaf">
          Published
        </span>
      </div>
      <ul className="mt-4 space-y-3 text-[0.9rem]">
        <li className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <p className="font-semibold">Jollof rice & grilled chicken</p>
            <p className="text-xs text-muted">Depletes: rice, chicken, pepper mix</p>
          </div>
          <span className="font-semibold tabular-nums">₦4,500</span>
        </li>
        <li className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <p className="font-semibold">Catfish pepper soup</p>
            <p className="text-xs text-muted">Availability follows your stock</p>
          </div>
          <span className="font-semibold tabular-nums">₦6,000</span>
        </li>
        <li className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Chapman (jug)</p>
            <p className="text-xs text-muted">86&apos;d automatically at zero stock</p>
          </div>
          <span className="font-semibold tabular-nums">₦3,200</span>
        </li>
      </ul>
      <p className="mt-4 text-xs text-muted">
        Illustrative menu — six site templates, your brand colors, one QR per
        table.
      </p>
    </div>
  );
}

function BomMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <p className="font-display text-base font-bold">
        Made-up item · Gift hamper (large)
      </p>
      <p className="mt-1 text-xs text-muted">
        Selling one depletes every component
      </p>
      <ul className="mt-4 space-y-2.5 text-[0.9rem]">
        {[
          ["Wicker basket", "× 1", "batch B-102"],
          ["Red wine 75cl", "× 2", "batch B-097"],
          ["Assorted biscuits", "× 3", "batch B-115"],
          ["Ribbon & wrap", "× 1", "batch B-088"],
        ].map(([name, qty, batch]) => (
          <li key={name} className="flex items-center justify-between gap-3">
            <span className="font-medium">{name}</span>
            <span className="flex items-center gap-3 text-muted">
              <span className="tabular-nums">{qty}</span>
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs">
                {batch}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl bg-paper px-3.5 py-2.5 text-[0.85rem] text-muted">
        Cost rolls up from component batches — so you know the hamper&apos;s
        real margin. Illustrative data.
      </p>
    </div>
  );
}

function ExpiryMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-bold">Expiring soon · Ikeja</p>
        <span className="rounded-full bg-amber/20 px-2.5 py-1 text-xs font-semibold text-amber-deep">
          FEFO active
        </span>
      </div>
      <ul className="mt-4 space-y-3 text-[0.9rem]">
        {[
          ["Amoxicillin 500mg · batch B-311", "Expires in 21 days", "142 units"],
          ["Vitamin C syrup · batch B-298", "Expires in 34 days", "60 units"],
          ["Ibuprofen 200mg · batch B-305", "Expires in 48 days", "310 units"],
        ].map(([name, exp, qty]) => (
          <li
            key={name}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line pb-3 last:border-0 last:pb-0"
          >
            <span className="font-semibold">{name}</span>
            <span className="text-xs text-muted">{exp}</span>
            <span className="w-full text-xs text-muted">
              {qty} — sells first, automatically
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Illustrative worklist — first-expired, first-out allocation is live
        today.
      </p>
    </div>
  );
}

function StationMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <p className="font-display text-base font-bold">Stations overview</p>
      <ul className="mt-4 space-y-3 text-[0.9rem]">
        {[
          ["Apapa station", "₦1.84m today", "Diesel low — reorder flagged"],
          ["Ikorodu station", "₦1.12m today", "All products in range"],
          ["Sagamu station", "₦0.96m today", "Transfer in transit"],
        ].map(([name, takings, note]) => (
          <li
            key={name}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 last:border-0 last:pb-0"
          >
            <span className="font-semibold">{name}</span>
            <span className="tabular-nums text-muted">{takings}</span>
            <span className="w-full text-xs text-muted">{note}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Illustrative data — each station is a branch on the same stock core.
      </p>
    </div>
  );
}

type Scene = {
  id: string;
  name: string;
  headline: string;
  body: string;
  points: string[];
  media: React.ReactNode;
  flip?: boolean;
  roadmap?: string;
};

export default function IndustriesPage() {
  const scenes: Scene[] = [
    {
      id: "restaurants",
      name: "Restaurants & hospitality",
      headline: "The kitchen, the floor and the books — one service.",
      body: "Tables with QR menus, a public reservations page, and orders that deplete real ingredients the moment they're rung — so the menu never promises what the kitchen doesn't have.",
      points: [
        "Dine-in tables with capacity, status and QR codes",
        "A published menu site — six templates, your colors, your slug",
        "Meals as bill-of-materials: selling one depletes each ingredient",
        "Reservations with a public booking page",
      ],
      media: <MenuMock />,
    },
    {
      id: "retail",
      name: "Retail shops",
      headline: "Sell at the counter and in the DMs — same shelf.",
      body: "Barcode POS, per-branch prices, and AI agents answering 'how much' on WhatsApp against the same stock your cashier sees.",
      points: [
        "Barcode catalog with cost, sale price and images",
        "Low-stock and out-of-stock worklists per branch",
        "Bank-transfer payments that confirm themselves",
        "CSV bulk upload for your existing product list",
      ],
      media: (
        <img
          src="/img/woman-selling-makeup.jpeg"
          alt="A shop owner taking a customer order by phone in her cosmetics store"
          className="h-full max-h-[440px] w-full rounded-2xl object-cover shadow-lift"
        />
      ),
      flip: true,
    },
    {
      id: "wholesale",
      name: "Wholesale & distribution",
      headline: "Move volume. Keep every carton accounted for.",
      body: "B2B purchase orders with a full lifecycle, MOQs and partner pricing on the Kuza network, and wallet settlement that lands instantly in both businesses' books.",
      points: [
        "Purchase orders: draft → ship → receive → pay → confirm",
        "Minimum order quantities, availability and bargaining terms",
        "Multi-branch stock with transfer workflows",
        "FIFO cost batches so margins stay honest at volume",
      ],
      media: (
        <img
          src="/img/business-boxes.avif"
          alt="Stacked cartons of wholesale stock"
          className="h-full max-h-[440px] w-full rounded-2xl object-cover shadow-lift"
        />
      ),
    },
    {
      id: "services",
      name: "Services",
      headline: "Invoice like a firm. Run payroll like one too.",
      body: "White-label invoices with your logo and terms, receivables that track themselves, and a People module that takes attendance through to pay stubs.",
      points: [
        "Branded invoices with email delivery and payment recording",
        "Customers with credit limits and receivables aging",
        "Attendance, leave and payroll runs that post to your books",
        "Copilot answers: 'can I afford another hire?'",
      ],
      media: (
        <img
          src="/img/family-business-plan.avif"
          alt="Business partners planning over documents"
          className="h-full max-h-[440px] w-full rounded-2xl object-cover shadow-lift"
        />
      ),
      flip: true,
    },
    {
      id: "fuel",
      name: "Fuel stations",
      headline: "Every station, every product, one ledger.",
      body: "Each station is a branch on Kuza's shared stock core — takings, product levels, transfers and shift staff, visible from wherever you are.",
      points: [
        "Stations as branches with scoped staff access",
        "Reason-coded adjustments for losses — approval-gated",
        "A payment ledger per station, reconciled to orders",
        "Attendance and payroll for shift workers",
      ],
      media: <StationMock />,
    },
    {
      id: "manufacturing",
      name: "Manufacturing & assembly",
      headline: "From components to finished goods, costs included.",
      body: "Define what goes into what. Selling a finished item depletes its components across batches, and the real cost rolls up into every margin you see.",
      points: [
        "Bill-of-materials with component depletion",
        "Batch traceability back to supplier and cost",
        "Units of measure with conversions",
        "Goods-in approval so inputs enter at the right cost",
      ],
      media: <BomMock />,
      flip: true,
    },
    {
      id: "pharmacy",
      name: "Pharmacy",
      headline: "Expiry-aware stock is ready. Pharmacy workflows are next.",
      body: "Kuza's FEFO batches with expiry dates and expiring-soon worklists already handle date-sensitive stock. Dedicated pharmacy workflows are on our roadmap.",
      points: [
        "FEFO allocation — first-expired, first-out",
        "Expiring-soon worklists per branch",
        "Batch-level traceability for recalls",
      ],
      media: <ExpiryMock />,
      roadmap: "On the roadmap",
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-forest-deep text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-16 md:px-8 lg:grid-cols-2 lg:pb-20 lg:pt-20">
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Your trade has its own rhythm. Kuza plays it.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              One operating core — stock, orders, money, people — dressed for
              the way your industry actually works. No generic pitch; here&apos;s
              what Kuza does for each.
            </p>
            <nav aria-label="Industries" className="mt-8 flex flex-wrap gap-2.5">
              {scenes.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-amber hover:text-amber"
                >
                  {s.name}
                </a>
              ))}
            </nav>
          </div>
          <img
            src="/img/hausa-woman.avif"
            alt="A trader smiling in her market best"
            className="h-72 w-full rounded-3xl object-cover shadow-lift lg:h-96"
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {scenes.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className={`scroll-mt-24 py-16 lg:py-24 ${
              i > 0 ? "border-t border-line" : ""
            }`}
          >
            <div
              className={`grid items-center gap-12 lg:grid-cols-2 ${
                s.flip ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <h2 className="flex flex-wrap items-center gap-3 font-display text-3xl font-bold text-forest sm:text-[2.35rem] sm:leading-tight">
                  {s.name}
                  {s.roadmap && (
                    <span className="rounded-full bg-amber/20 px-3 py-1.5 text-xs font-semibold text-amber-deep">
                      {s.roadmap}
                    </span>
                  )}
                </h2>
                <p className="mt-3 font-display text-xl font-semibold leading-snug text-leaf">
                  {s.headline}
                </p>
                <p className="mt-3 text-lg leading-relaxed text-muted">
                  {s.body}
                </p>
                <ul className="mt-6 space-y-3 text-[1.02rem]">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-3">
                      <span
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber"
                        aria-hidden="true"
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>{s.media}</div>
            </div>
          </section>
        ))}
      </div>

      <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8">
        <div className="rounded-3xl bg-paper px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-forest sm:text-4xl">
            Don&apos;t see your trade? If you stock and sell, Kuza fits.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            The trial is all-access — set up your real operation and see.
          </p>
          <a
            href={REGISTER_URL}
            className="mt-8 inline-block rounded-full bg-leaf px-8 py-4 text-base font-semibold text-white shadow-lift transition-colors hover:bg-leaf-dark"
          >
            Start your free trial
          </a>
        </div>
      </section>
    </>
  );
}
