import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ArrowR = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function Home() {
  return (
    <>
      <Head>
        <title>Kuza — The operating system for growing African businesses</title>
        <meta name="description" content="Kuza is the AI-powered ERP for African businesses. It does your books and collects your money — no accountant required. Restaurant, retail, inventory, invoicing, accounting, payroll and payments in one platform." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Header />

      <main>
        {/* ===== HERO (lifestyle-led) ===== */}
        <section className="kx-hero">
          <div className="container kx-hero-grid">
            <div className="hero-copy">
              <span className="kx-eyebrow reveal"><span className="dot"></span> The operating system for African business</span>
              <h1 className="kx-h1 reveal" data-delay="1">Run your entire business on <span className="g">one platform</span>.</h1>
              <p className="kx-sub reveal" data-delay="2">Sales, stock, invoicing, accounting, payroll and payments — all in one place, built for how African businesses actually run. Kuza keeps your books true and collects your money. No accountant required.</p>
              <div className="btn-row reveal" data-delay="3" style={{ marginTop: '28px' }}>
                <a href="http://localhost:5001/register" className="btn btn--primary btn--lg">Start free <ArrowR /></a>
                <a href="#spotlight" className="btn btn--ghost btn--lg">See how it works</a>
              </div>
              <p className="hero-note reveal" data-delay="4" style={{ marginTop: '18px' }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Free-forever plan · No card required · Priced in your currency
              </p>
            </div>

            {/* Photo-led hero: image slot + floating product proof. Drop a real photo into .kx-photo. */}
            <div className="hero-visual reveal" data-delay="2" style={{ position: 'relative' }}>
              <div className="kx-photo tall">
                {/* Replace with: <img src="/img/hero-owner.jpg" alt="A Kuza business owner" /> */}
                <div className="ph">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  <b>Business owner</b>
                </div>
              </div>
              <div className="kx-fchip" style={{ left: '-16px', bottom: '64px' }}>
                <span className="ic bg-em"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 19V5m0 14h16M8 15l3-4 3 2 4-6" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                <span><span className="l">Revenue today</span><span className="v">₦842,500</span></span>
              </div>
              <div className="kx-fchip" style={{ right: '-14px', top: '44px' }}>
                <span className="ic bg-in"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 13 4 4L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                <span><span className="l">Payments</span><span className="v">Auto-reconciled</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRUST ===== */}
        <section className="trustbar">
          <div className="container">
            <p className="trust-label">Built for every kind of African business</p>
            <div className="marquee">
              <div className="marquee-track">
                <span className="marquee-item"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg> Restaurants</span>
                <span className="marquee-item"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9h18l-1.4 9.3A2 2 0 0 1 17.6 20H6.4a2 2 0 0 1-2-1.7L3 9Z" stroke="currentColor" strokeWidth="1.8" /></svg> Retail shops</span>
                <span className="marquee-item"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7 12 3l9 4-9 4-9-4Z" stroke="currentColor" strokeWidth="1.8" /></svg> Wholesalers</span>
                <span className="marquee-item"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 2h9l3 3v17l-2.5-1.5L13 22l-2.5-1.5L8 22l-2.5-1.5L4 22V4a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" /></svg> Agencies</span>
                <span className="marquee-item"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 21h18M6 21V8l6-4 6 4v13M10 21v-5h4v5" stroke="currentColor" strokeWidth="1.8" /></svg> Pharmacies</span>
                <span className="marquee-item"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v18M5 8h14M5 16h14" stroke="currentColor" strokeWidth="1.8" /></svg> Salons & spas</span>
                <span className="marquee-item"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg> Service firms</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SPOTLIGHTS (numbered, photo-led) ===== */}
        <section className="kx-sec" id="spotlight">
          <div className="container">
            <div className="kx-head">
              <span className="kx-eyebrow reveal"><span className="dot"></span> One platform, end to end</span>
              <h2 className="reveal" data-delay="1">Sell, get paid, and pay your people — without leaving Kuza.</h2>
              <p className="reveal" data-delay="2">Everything talks to itself. A sale drops your stock, posts to your books and reconciles your cash — automatically.</p>
            </div>

            {/* 01 Sell */}
            <div className="kx-spot reveal" style={{ marginTop: 'clamp(34px,4vw,56px)' }}>
              <div className="kx-spot-copy">
                <span className="kx-num"><span className="n">01</span><span className="bar"></span> Sell anywhere</span>
                <h3>A fast, modern counter for shops and restaurants.</h3>
                <p>Ring up sales on any device — barcode scan, split payments, instant receipts and QR menus for the table. Every sale updates stock and books in real time.</p>
                <ul className="kx-checks">
                  <li><Check /><span><b>POS & restaurant orders</b> with tables, kitchen tickets and receipts.</span></li>
                  <li><Check /><span>Stock drops and the ledger posts <b>the moment you sell</b>.</span></li>
                </ul>
              </div>
              <div className="kx-spot-media" style={{ position: 'relative' }}>
                <div className="kx-photo wide">
                  <div className="ph"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9h18l-1.4 9.3A2 2 0 0 1 17.6 20H6.4a2 2 0 0 1-2-1.7L3 9Zm3 0V7a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><b>At the counter</b></div>
                </div>
                <div className="kx-fchip" style={{ right: '-14px', bottom: '-16px' }}>
                  <span className="ic bg-em"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9h18l-1.4 9.3A2 2 0 0 1 17.6 20H6.4a2 2 0 0 1-2-1.7L3 9Z" stroke="#fff" strokeWidth="1.9" /></svg></span>
                  <span><span className="l">Sale complete</span><span className="v">₦15,500</span></span>
                </div>
              </div>
            </div>

            {/* 02 Get paid */}
            <div className="kx-spot flip reveal">
              <div className="kx-spot-copy">
                <span className="kx-num"><span className="n">02</span><span className="bar"></span> Get paid & reconcile</span>
                <h3>Money that collects — and reconciles — itself.</h3>
                <p>Take payment by transfer, card or mobile money. Kuza catches it, matches it to the right invoice, marks it paid and posts the entry. The month-end reconciliation just disappears.</p>
                <ul className="kx-checks">
                  <li><Check /><span><b>Paystack & Monnify</b> pay-by-link and virtual accounts, live today.</span></li>
                  <li><Check /><span><b>Auto-matched</b> across bank, card and cash — nothing slips through.</span></li>
                </ul>
              </div>
              <div className="kx-spot-media" style={{ position: 'relative' }}>
                <div className="kx-photo wide">
                  <div className="ph"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 7h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm0 4h20M6 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><b>Getting paid</b></div>
                </div>
                <div className="kx-fchip" style={{ left: '-16px', bottom: '-16px' }}>
                  <span className="ic bg-in"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 13 4 4L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  <span><span className="l">MoMo → Invoice #1043</span><span className="v">Matched · ₦85,000</span></span>
                </div>
              </div>
            </div>

            {/* 03 Payroll */}
            <div className="kx-spot reveal">
              <div className="kx-spot-copy">
                <span className="kx-num"><span className="n">03</span><span className="bar"></span> Payroll for Africa</span>
                <h3>Payroll that already speaks PAYE, pension & NHF.</h3>
                <p>Foreign systems ship US tax tables and make you hire a consultant for the local statutory. Kuza is built the other way round — enter a salary and the deductions, payslip and net pay come out right.</p>
                <ul className="kx-checks">
                  <li><Check /><span><b>PAYE, pension and NHF</b> computed automatically.</span></li>
                  <li><Check /><span>Payslips out, <b>net pay disbursed</b> — no accountant needed.</span></li>
                </ul>
              </div>
              <div className="kx-spot-media" style={{ position: 'relative' }}>
                <div className="kx-photo wide">
                  <div className="ph"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><b>Payday</b></div>
                </div>
                <div className="kx-fchip" style={{ right: '-14px', bottom: '-16px' }}>
                  <span className="ic bg-em"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  <span><span className="l">Net pay · June</span><span className="v">₦364,500</span></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== BRAND STATEMENT ===== */}
        <section className="kx-sec" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="kx-band reveal">
              <span className="kx-eyebrow" style={{ color: '#7ff0c8' }}><span className="dot" style={{ background: '#3fe0a8' }}></span> Why Kuza</span>
              <h2>Built for how African businesses actually run.</h2>
              <p>Mobile money, local payroll, tax that fits and prices in your currency — not a foreign template you bend to fit. One platform your whole team logs into, set up in minutes.</p>
              <div className="btn-row">
                <a href="http://localhost:5001/register" className="btn btn--light btn--lg">Start free</a>
                <a href="/pricing" className="btn btn--light btn--lg" style={{ background: 'transparent' }}>See pricing</a>
              </div>
              <div className="kx-bstats">
                <div><div className="n">Minutes</div><div className="l">from sign-up to your first sale</div></div>
                <div><div className="n">7 in 1</div><div className="l">sales, stock, invoicing, accounting, payroll & payments</div></div>
                <div><div className="n">₦ local</div><div className="l">priced in your currency — no dollar surprises</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="kx-sec" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="kx-head mid">
              <span className="kx-eyebrow reveal"><span className="dot"></span> From the shop floor</span>
              <h2 className="reveal" data-delay="1">Made with African operators, for African operators.</h2>
              <p className="reveal" data-delay="2">Real words go here — swap these for your customers' as they come in.</p>
            </div>
            <div className="kx-testi-grid">
              <div className="kx-testi reveal">
                <div className="quote">“</div>
                <p>Before Kuza I closed late every night reconciling cash and transfers. Now it's done by the time I lock up.</p>
                <div className="who"><span className="av bg-em">AO</span><span><span className="nm">Amara O.</span><span className="rl">Grill house · Lagos</span></span></div>
              </div>
              <div className="kx-testi reveal" data-delay="1">
                <div className="quote">“</div>
                <p>Payroll used to mean a spreadsheet and a headache. Kuza works out PAYE and pension and just pays everyone.</p>
                <div className="who"><span className="av bg-in">KM</span><span><span className="nm">Kwame M.</span><span className="rl">Pharmacy chain · Accra</span></span></div>
              </div>
              <div className="kx-testi reveal" data-delay="2">
                <div className="quote">“</div>
                <p>One login for my two shops — sales, stock and books all in one place. I finally know where the business stands.</p>
                <div className="who"><span className="av bg-em">NE</span><span><span className="nm">Ngozi E.</span><span className="rl">Fashion retail · Abuja</span></span></div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== PRODUCT SUITE ===== */}
        <section className="kx-sec" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="kx-head mid">
              <span className="kx-eyebrow reveal"><span className="dot"></span> The complete suite</span>
              <h2 className="reveal" data-delay="1">Switch on what you need. It all fits together.</h2>
              <p className="reveal" data-delay="2">Start with one module and add more as you grow — same login, same data, one bill.</p>
            </div>
            <div className="grid grid-3" style={{ marginTop: 'clamp(28px,4vw,44px)' }}>
              <a href="/restaurant" className="card prod-card reveal">
                <div className="ic-tile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9" stroke="#0f9d6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="h3">Restaurant</h3>
                <p>Orders, tables, menus and a kitchen display that keeps every ticket moving.</p>
                <span className="link-arrow">Explore Restaurant <ArrowR /></span>
              </a>
              <a href="/shop" className="card prod-card reveal" data-delay="1">
                <div className="ic-tile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9h18l-1.4 9.3A2 2 0 0 1 17.6 20H6.4a2 2 0 0 1-2-1.7L3 9Zm3 0V7a4 4 0 0 1 8 0v2" stroke="#0f9d6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="h3">Shop / POS</h3>
                <p>Lightning-fast checkout with barcode scanning, split payments and instant receipts.</p>
                <span className="link-arrow">Explore Shop <ArrowR /></span>
              </a>
              <a href="/inventory" className="card prod-card reveal" data-delay="2">
                <div className="ic-tile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7 12 3l9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10" stroke="#0f9d6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="h3">Inventory</h3>
                <p>Track stock across branches with receiving, transfers, valuation and low-stock alerts.</p>
                <span className="link-arrow">Explore Inventory <ArrowR /></span>
              </a>
              <a href="/invoicing" className="card prod-card reveal">
                <div className="ic-tile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 2h9l3 3v17l-2.5-1.5L13 22l-2.5-1.5L8 22l-2.5-1.5L4 22V4a2 2 0 0 1 2-2Zm2 6h8M8 12h8M8 16h5" stroke="#0f9d6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="h3">Invoicing</h3>
                <p>Send branded invoices with a pay-by-link and watch accounts receivable clear itself.</p>
                <span className="link-arrow">Explore Invoicing <ArrowR /></span>
              </a>
              <a href="/accounting" className="card prod-card reveal" data-delay="1">
                <div className="ic-tile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 4h8M8 11h3m-3 4h3m4-4v4" stroke="#0f9d6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="h3">Accounting</h3>
                <p>Double-entry books that post themselves, plus P&L, balance sheet and tax-ready reports.</p>
                <span className="link-arrow">Explore Accounting <ArrowR /></span>
              </a>
              <a href="/people" className="card prod-card reveal" data-delay="2">
                <div className="ic-tile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" stroke="#0f9d6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="h3">People & Payroll</h3>
                <p>Employees, attendance, leave and payroll that runs on time with the right deductions.</p>
                <span className="link-arrow">Explore People <ArrowR /></span>
              </a>
              <a href="/payments" className="card prod-card reveal">
                <div className="ic-tile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 7h20v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm0 4h20M6 15h4" stroke="#0f9d6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="h3">Payments</h3>
                <p>Collect with Paystack links and cards, then auto-reconcile every kobo to your ledger.</p>
                <span className="link-arrow">Explore Payments <ArrowR /></span>
              </a>
              <a href="/menu" className="card prod-card reveal" data-delay="1">
                <span className="prod-tag">Free</span>
                <div className="ic-tile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 3h3m0 0h1m-4 4h4v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="h3">Kuza Menu</h3>
                <p>A free, beautiful QR menu customers scan at the table — your on-ramp to the whole platform.</p>
                <span className="link-arrow">Get a free menu <ArrowR /></span>
              </a>
              <a href="/pricing" className="card prod-card reveal" data-delay="2">
                <div className="ic-tile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Zm9-4v8m-2.5-6h3.5a2 2 0 0 1 0 4H10m0 0h3.5a2 2 0 0 1 0 4H9.5" stroke="#0f9d6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="h3">Simple pricing</h3>
                <p>Free forever to start, then flat plans in your currency with no per-transaction surprises.</p>
                <span className="link-arrow">See pricing <ArrowR /></span>
              </a>
            </div>
          </div>
        </section>

        {/* ===== AI TEASER ===== */}
        <section className="kx-sec" id="ai" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ai-panel reveal">
              <div className="ai-inner">
                <div>
                  <span className="eyebrow" style={{ background: '#ffffff14', borderColor: '#ffffff26', color: '#c7f9e5' }}><span className="dot" style={{ background: '#34d399' }}></span> Kuza AI</span>
                  <h2 className="h2" style={{ color: '#fff', marginTop: '16px' }}>Just ask. Your business, in plain language.</h2>
                  <p className="lead" style={{ marginTop: '16px' }}>Kuza AI reads your live data and answers the questions you'd normally pay for. "How did we do last month?" "Which items are running low?" "Who still owes me?" — and it can draft the invoice or reorder for you.</p>
                  <div className="btn-row" style={{ marginTop: '26px' }}>
                    <a href="http://localhost:5001/register" className="btn btn--light btn--lg">Try Kuza AI free</a>
                  </div>
                </div>
                <div className="chatbox">
                  <div className="chat-row"><span className="chat-av">You</span><div className="chat-bub">How did the shop do last month, and what should I restock?</div></div>
                  <div className="chat-row"><span className="chat-av chat-av--ai">AI</span><div className="chat-bub"><b>March revenue was ₦4.2M</b>, up 22% on February. Your best sellers were Jollof combo and bottled water. <b>3 items are below reorder level</b> — want me to draft a purchase order?
                    <div className="chat-metrics"><span className="chat-chip">Revenue +22%</span><span className="chat-chip">Margin 41%</span><span className="chat-chip">3 low-stock</span></div>
                  </div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== PRICING TEASER ===== */}
        <section className="kx-sec" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="kx-head mid">
              <span className="kx-eyebrow reveal"><span className="dot"></span> Pricing</span>
              <h2 className="reveal" data-delay="1">Fair, flat, in your currency</h2>
              <p className="reveal" data-delay="2">Start free forever. Upgrade when you're ready — no per-transaction nibbling, no surprise bills.</p>
            </div>
            <div className="grid grid-3" style={{ marginTop: 'clamp(28px,4vw,44px)' }}>
              <div className="card reveal">
                <div className="price-name">Free</div>
                <div className="price-desc">For getting started and QR menus.</div>
                <div className="price-amt"><span className="cur">₦</span><span className="val">0</span><span className="per">/mo</span></div>
                <a href="http://localhost:5001/register" className="btn btn--ghost btn--block">Start free</a>
              </div>
              <div className="card reveal" data-delay="1" style={{ border: '1.5px solid transparent', background: 'linear-gradient(var(--surface),var(--surface)) padding-box,var(--grad-brand) border-box', boxShadow: 'var(--sh-lg)' }}>
                <div className="price-name">Growth <span style={{ fontSize: '.7rem', color: '#fff', background: 'var(--emerald)', padding: '3px 9px', borderRadius: '999px', verticalAlign: 'middle', marginLeft: '6px' }}>Popular</span></div>
                <div className="price-desc">Everything a busy business needs.</div>
                <div className="price-amt"><span className="cur">₦</span><span className="val">18,000</span><span className="per">/mo</span></div>
                <a href="/pricing" className="btn btn--primary btn--block">See what's included</a>
              </div>
              <div className="card reveal" data-delay="2">
                <div className="price-name">Enterprise</div>
                <div className="price-desc">Multi-branch, roles and support.</div>
                <div className="price-amt"><span className="val" style={{ fontSize: '1.8rem' }}>Custom</span></div>
                <a href="/pricing" className="btn btn--ghost btn--block">Talk to sales</a>
              </div>
            </div>
            <p className="center reveal" style={{ marginTop: '26px' }}><a href="/pricing" className="link-arrow" style={{ justifyContent: 'center' }}>Compare all plans <ArrowR /></a></p>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="kx-sec" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band reveal">
              <h2>Run your whole business on Kuza</h2>
              <p className="lead measure mx-auto">Books that keep themselves, money that collects itself, and AI that answers the hard questions. Start free — no card, no accountant.</p>
              <div className="btn-row">
                <a href="http://localhost:5001/register" className="btn btn--dark btn--lg">Start free</a>
                <a href="/pricing" className="btn btn--light btn--lg">See pricing</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
