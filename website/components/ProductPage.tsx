import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';

const ArrowR = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// Shared "everything in one login" modules — identical on every product page.
const MODS = [
  { title: 'Sell & POS', desc: 'Counter, orders and receipts on any device.', d: 'M3 9h18l-1.4 9.3A2 2 0 0 1 17.6 20H6.4a2 2 0 0 1-2-1.7L3 9Zm3 0V7a4 4 0 0 1 8 0v2' },
  { title: 'Inventory', desc: 'Stock, transfers and valuation across branches.', d: 'M3 7 12 3l9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10' },
  { title: 'Invoicing', desc: 'Branded invoices with pay-by-link.', d: 'M6 2h9l3 3v17l-2.5-1.5L13 22l-2.5-1.5L8 22l-2.5-1.5L4 22V4a2 2 0 0 1 2-2Zm2 6h8M8 12h8' },
  { title: 'Accounting', desc: 'Double-entry books that post themselves.', d: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 4h8M8 11h3m-3 4h3m4-4v4' },
  { title: 'People & Payroll', desc: 'Staff, leave and PAYE/pension payroll.', d: 'M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
  { title: 'Payments', desc: 'Collect and auto-reconcile every kobo.', d: 'M2 7h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm0 4h20M6 15h4' },
  { title: 'Kuza AI', desc: 'Plain-language answers from your data.', d: 'M12 3a9 9 0 1 0 9 9M12 3v9l6-6M12 3a9 9 0 0 1 6 3' },
  { title: 'Reports', desc: 'Live dashboards and tax-ready exports.', d: 'M4 19V5m0 14h16M8 15l3-4 3 2 4-6' },
];

export interface Product {
  eyebrow: string;
  title: string;
  blurb: string;
  img: string;
  alt: string;
  bullets: string[];
}

export const PRODUCTS: Record<string, Product> = {
  restaurant: {
    eyebrow: 'Restaurant',
    title: 'Run a smoother restaurant.',
    blurb: 'Orders, tables, menus and a kitchen display that keeps every ticket moving — with your stock and books handled underneath.',
    img: '/img/woman-selling-with-kids.jpeg',
    alt: 'A family dining at a restaurant',
    bullets: ['Table & order management with a live kitchen display', 'QR menus customers scan and order from at the table', 'Every sale drops stock and posts to your books automatically'],
  },
  shop: {
    eyebrow: 'Shop / POS',
    title: 'A fast, modern counter.',
    blurb: 'Lightning-fast retail checkout with barcode scanning, split payments and instant receipts — across every branch.',
    img: '/img/woman-selling-cup.jpeg',
    alt: 'A shop owner checking stock',
    bullets: ['Barcode checkout, split payments and instant receipts', 'Live stock and takings across all your branches', 'Cash and card reconciled to your ledger automatically'],
  },
  inventory: {
    eyebrow: 'Inventory',
    title: 'Know exactly what you have.',
    blurb: 'Track stock across branches with receiving, transfers, valuation and low-stock alerts — no more guessing or stockouts.',
    img: '/img/woman-selling.jpeg',
    alt: 'A business owner reviewing stock on a tablet',
    bullets: ['Receiving, transfers and multi-branch stock levels', 'Valuation and low-stock alerts before you run out', 'A full movement ledger for every item'],
  },
  invoicing: {
    eyebrow: 'Invoicing',
    title: 'Send invoices, get paid faster.',
    blurb: 'Branded invoices with a pay-by-link, so customers pay in a tap and your receivables clear themselves.',
    img: '/img/woman-selling-makeup.jpeg',
    alt: 'A business owner taking an order by phone',
    bullets: ['Branded invoices with a one-tap pay-by-link', 'Payments auto-match and mark invoices paid', 'See who owes you at a glance and nudge them'],
  },
  accounting: {
    eyebrow: 'Accounting',
    title: 'Clean books, no accountant.',
    blurb: 'Every transaction posts to a proper double-entry ledger behind the scenes — you get P&L, balance sheet and tax-ready reports.',
    img: '/img/woman-selling.jpeg',
    alt: 'A business owner using the app',
    bullets: ['Double-entry books that post themselves', 'P&L, balance sheet and cash-flow, live', 'VAT and WHT tracked, ready for filing'],
  },
  people: {
    eyebrow: 'People & Payroll',
    title: 'Pay your team, done right.',
    blurb: 'Employees, attendance and leave, plus payroll that already knows PAYE, pension and NHF — payslips out and net pay disbursed.',
    img: '/img/woman-selling-with-kids.jpeg',
    alt: 'A team at work',
    bullets: ['PAYE, pension and NHF computed automatically', 'Payslips your team can trust, net pay disbursed', 'Attendance and leave in the same place'],
  },
  payments: {
    eyebrow: 'Payments',
    title: 'Collect money, reconciled.',
    blurb: 'Take payment by transfer, card or mobile money — Kuza catches it, matches it to the invoice and posts the entry.',
    img: '/img/woman-selling-makeup.jpeg',
    alt: 'A business owner getting paid',
    bullets: ['Paystack & Monnify pay-by-link and virtual accounts', 'Auto-matched across bank, card and cash', 'An unmatched worklist so nothing slips through'],
  },
};

export default function ProductPage({ slug }: { slug: string }) {
  const p = PRODUCTS[slug];
  if (!p) return null;
  return (
    <>
      <Head>
        <title>{`Kuza — ${p.eyebrow}`}</title>
        <meta name="description" content={p.blurb} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Header />

      <main>
        <section className="kx-hero">
          <div className="container kx-hero-grid">
            <div className="hero-copy">
              <span className="kx-eyebrow reveal">{p.eyebrow}</span>
              <h1 className="kx-h1 reveal" data-delay="1">{p.title}</h1>
              <p className="kx-sub reveal" data-delay="2">{p.blurb}</p>
              <ul className="kx-checks reveal" data-delay="3" style={{ marginTop: '24px' }}>
                {p.bullets.map((b) => (
                  <li key={b}><Check /><span>{b}</span></li>
                ))}
              </ul>
              <div className="btn-row reveal" data-delay="4" style={{ marginTop: '28px' }}>
                <a href="http://localhost:5001/register" className="btn btn--primary btn--lg">Start free <ArrowR /></a>
                <a href="/#business" className="btn btn--ghost btn--lg">See how it works</a>
              </div>
            </div>
            <div className="hero-visual reveal" data-delay="2">
              <div className="kx-photo tall">
                <img src={p.img} alt={p.alt} />
              </div>
            </div>
          </div>
        </section>

        <section className="kx-sec" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="kx-head mid">
              <h2 className="reveal">It all fits together in one login.</h2>
              <p className="reveal" data-delay="1">{p.eyebrow} is one module of the Kuza platform — switch on the rest as you grow, same data, one bill.</p>
            </div>
            <div className="kx-mods">
              {MODS.map((m) => (
                <div className="kx-mod reveal" key={m.title}>
                  <span className="ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={m.d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  <h4>{m.title}</h4>
                  <p>{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="kx-sec" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band reveal">
              <h2>Run your whole business on Kuza</h2>
              <p className="lead measure mx-auto">Start free — no card, no accountant. Add {p.eyebrow.toLowerCase()} and every other module as you grow.</p>
              <div className="btn-row">
                <a href="http://localhost:5001/register" className="btn btn--dark btn--lg">Start free</a>
                <a href="/#business" className="btn btn--light btn--lg">See how it works</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
