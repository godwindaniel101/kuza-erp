import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ArrowR = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// Business verticals — photo on top, description underneath.
const BIZ = [
  {
    href: '/restaurant',
    tag: 'Restaurants & food',
    img: '/img/istockphoto-2032134582-1024x1024.jpg',
    alt: 'A family at a restaurant table',
    title: 'Restaurants & food',
    desc: 'Menus, tables, kitchen tickets and QR ordering — with your books and stock kept behind the scenes.',
    cta: 'Explore Restaurant',
  },
  {
    href: '/shop',
    tag: 'Retail & shops',
    img: '/img/istockphoto-2242938419-1024x1024.jpg',
    alt: 'A shop owner checking stock',
    title: 'Retail & shops',
    desc: 'Fast POS, barcode stock and instant receipts across every branch — takings reconciled automatically.',
    cta: 'Explore Shop',
  },
  {
    href: '/inventory',
    tag: 'Wholesale & agribusiness',
    img: '/img/istockphoto-1703931443-1024x1024.jpg',
    alt: 'A farmer using a tablet',
    title: 'Wholesale & agribusiness',
    desc: 'Bulk orders, multi-branch stock and credit customers — tracked, invoiced and settled in one place.',
    cta: 'Explore Inventory',
  },
  {
    href: '/invoicing',
    tag: 'Services & specialty',
    img: '/img/istockphoto-2259853301-1024x1024.jpg',
    alt: 'A specialty shop owner on the phone',
    title: 'Services & specialty',
    desc: 'Invoices, payments and payroll for salons, pharmacies, agencies and service firms of every size.',
    cta: 'Explore Invoicing',
  },
];

// Capabilities — the actual modules, presented cleanly (no pricing/menu mixed in).
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
        {/* ===== HERO ===== */}
        <section className="kx-hero">
          <div className="container kx-hero-grid">
            <div className="hero-copy">
              <span className="kx-eyebrow reveal"><span className="dot"></span> The operating system for African business</span>
              <h1 className="kx-h1 reveal" data-delay="1">Run your entire business on <span className="g">one platform</span>.</h1>
              <p className="kx-sub reveal" data-delay="2">Sales, stock, invoicing, accounting, payroll and payments — all in one place, built for how African businesses actually run. Kuza keeps your books true and collects your money. No accountant required.</p>
              <div className="btn-row reveal" data-delay="3" style={{ marginTop: '28px' }}>
                <a href="http://localhost:5001/register" className="btn btn--primary btn--lg">Start free <ArrowR /></a>
                <a href="#business" className="btn btn--ghost btn--lg">See how it works</a>
              </div>
              <p className="hero-note reveal" data-delay="4" style={{ marginTop: '18px' }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Free-forever plan · No card required · Priced in your currency
              </p>
            </div>

            <div className="hero-visual reveal" data-delay="2" style={{ position: 'relative' }}>
              <div className="kx-photo tall">
                <img src="/img/istockphoto-2242939497-1024x1024.jpg" alt="A Kuza retail owner using the app in her shop" />
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

        {/* ===== BUILT FOR YOUR BUSINESS (photo top, description under) ===== */}
        <section className="kx-sec" id="business">
          <div className="container">
            <div className="kx-head">
              <h2 className="reveal">However you make your money, Kuza fits the way you work.</h2>
              <p className="reveal" data-delay="1">Kuza shapes itself to your trade — then runs the sales, stock, invoicing, payroll and books underneath, the same for everyone.</p>
            </div>
            <div className="kx-bizgrid">
              {BIZ.map((b) => (
                <a className="kx-bizcard reveal" href={b.href} key={b.href}>
                  <div className="pic">
                    <img src={b.img} alt={b.alt} />
                    <span className="tag">{b.tag}</span>
                  </div>
                  <div className="bd">
                    <h3>{b.title}</h3>
                    <p>{b.desc}</p>
                    <span className="link-arrow">{b.cta} <ArrowR /></span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ===== EVERYTHING IN ONE LOGIN (clean module grid) ===== */}
        <section className="kx-sec" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="kx-head mid">
              <h2 className="reveal">The whole business, in one place.</h2>
              <p className="reveal" data-delay="1">Switch on what you need today and add the rest as you grow — same data, one bill.</p>
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
