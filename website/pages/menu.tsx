import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ArrowR = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function Menu() {
  return (
    <>
      <Head>
        <title>Kuza — Free QR Menu</title>
        <meta name="description" content="A free, beautiful QR menu your customers scan at the table — and your on-ramp to running the whole business on Kuza." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Header />

      <main>
        <section className="kx-hero">
          <div className="container kx-hero-grid">
            <div className="hero-copy">
              <span className="kx-eyebrow reveal">Free QR Menu</span>
              <h1 className="kx-h1 reveal" data-delay="1">A beautiful menu, <span className="g">free forever</span>.</h1>
              <p className="kx-sub reveal" data-delay="2">Create a menu customers scan at the table — no app to download. It's the easiest way to start with Kuza, and it grows into your full POS whenever you're ready.</p>
              <ul className="kx-checks reveal" data-delay="3" style={{ marginTop: '24px' }}>
                <li><Check /><span>Set up your menu in minutes — photos, prices, categories</span></li>
                <li><Check /><span>Customers scan a QR code and browse instantly</span></li>
                <li><Check /><span>Upgrade to take orders &amp; payments when you're ready</span></li>
              </ul>
              <div className="btn-row reveal" data-delay="4" style={{ marginTop: '28px' }}>
                <a href="http://localhost:5001/register" className="btn btn--primary btn--lg">Get a free menu <ArrowR /></a>
                <a href="/restaurant" className="btn btn--ghost btn--lg">See Restaurant</a>
              </div>
            </div>
            <div className="hero-visual reveal" data-delay="2">
              <div className="kx-photo tall">
                <img src="/img/woman-selling-with-kids.jpeg" alt="Guests at a restaurant table" />
              </div>
            </div>
          </div>
        </section>

        <section className="kx-sec" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band reveal">
              <h2>Start with a free menu today</h2>
              <p className="lead measure mx-auto">No card, no commitment. When you're ready, turn it into a full restaurant &amp; POS on the same login.</p>
              <div className="btn-row">
                <a href="http://localhost:5001/register" className="btn btn--dark btn--lg">Get a free menu</a>
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
