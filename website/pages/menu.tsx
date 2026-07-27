import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import { SITE_URL, SITE_NAME } from '../lib/site';

const ArrowR = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const menuAppLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: `${SITE_NAME} Free QR Menu`,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${SITE_URL}/menu`,
  description:
    'A free digital QR menu for restaurants and cafes — customers scan a QR code and browse your menu with photos, prices and categories. Upgrade to full POS when ready.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'NGN',
    description: 'Free forever — no card required.',
  },
};

export default function Menu() {
  return (
    <>
      <Seo
        title="Free QR menu for restaurants & cafes | Kuza"
        description="Create a free, beautiful QR menu your customers scan at the table — photos, prices and categories, no app to download. Your on-ramp to running the whole business on Kuza."
        path="/menu"
        image="/img/woman-selling-with-kids.jpeg"
        jsonLd={menuAppLd}
      />

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
            <div className="hero-visual reveal px-4" data-delay="2">
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
