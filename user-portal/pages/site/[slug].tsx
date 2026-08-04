import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { fetchPublicSite, PublicSiteInfo } from '@/lib/site-public';
import type {
  WebsiteSection,
  HeroSection,
  TextSection,
  GallerySection,
  CtaSection,
} from '@/lib/website-sections';

/**
 * Public website renderer — the marketing site a visitor sees at /site/:slug.
 * SSR from the published WebsiteSite (/api/public/site/:slug). Self-contained
 * (the dashboard Layout is bypassed for /site/). "Shop now" links to the
 * tenant's Storefront (storefrontUrl).
 *
 * Phase 2: if the site has an ordered `sections` array, its enabled blocks are
 * rendered in order (hero/text/gallery/cta/contact). Otherwise it falls back to
 * the fixed Phase-1 layout (hero → About → Contact).
 */

interface Props {
  site: PublicSiteInfo;
  canonicalUrl: string;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/* ─── shared contact block ─── */
function ContactBlock({ site, accent, heading }: { site: PublicSiteInfo; accent: string; heading: string }) {
  const igHandle = site.instagram?.replace(/^@/, '');
  const waDigits = site.whatsapp?.replace(/[^\d]/g, '');
  if (!(site.phone || site.email || waDigits || igHandle || site.address)) return null;
  return (
    <section className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {waDigits && (
            <a href={`https://wa.me/${waDigits}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200 transition hover:ring-gray-300">
              <i className="bx bxl-whatsapp text-2xl" style={{ color: accent }} aria-hidden="true" />
              <span className="text-sm font-medium">{site.whatsapp}</span>
            </a>
          )}
          {igHandle && (
            <a href={`https://instagram.com/${igHandle}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200 transition hover:ring-gray-300">
              <i className="bx bxl-instagram text-2xl" style={{ color: accent }} aria-hidden="true" />
              <span className="text-sm font-medium">@{igHandle}</span>
            </a>
          )}
          {site.phone && (
            <a href={`tel:${site.phone}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200 transition hover:ring-gray-300">
              <i className="bx bx-phone text-2xl" style={{ color: accent }} aria-hidden="true" />
              <span className="text-sm font-medium">{site.phone}</span>
            </a>
          )}
          {site.email && (
            <a href={`mailto:${site.email}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200 transition hover:ring-gray-300">
              <i className="bx bx-envelope text-2xl" style={{ color: accent }} aria-hidden="true" />
              <span className="text-sm font-medium">{site.email}</span>
            </a>
          )}
          {site.address && (
            <div className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200 sm:col-span-2">
              <i className="bx bx-map text-2xl" style={{ color: accent }} aria-hidden="true" />
              <span className="text-sm font-medium">{site.address}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── section blocks ─── */
function HeroBlock({ s, accent, fallbackTitle }: { s: HeroSection; accent: string; fallbackTitle: string }) {
  const hasImg = !!s.imageUrl;
  return (
    <section className="relative overflow-hidden">
      {hasImg && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}
      <div className={`relative mx-auto max-w-5xl px-5 ${hasImg ? 'py-28 text-white' : 'py-24'}`}>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">{s.headline || fallbackTitle}</h1>
        {s.subtext && <p className={`mt-4 max-w-xl text-lg ${hasImg ? 'text-white/85' : 'text-gray-600'}`}>{s.subtext}</p>}
        {s.ctaHref && s.ctaLabel && (
          <a href={s.ctaHref} className="mt-8 inline-flex h-11 items-center rounded-lg px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90" style={{ background: accent }}>
            {s.ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

function TextBlock({ s }: { s: TextSection }) {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <div className={`grid items-center gap-8 ${s.imageUrl ? 'md:grid-cols-2' : ''}`}>
        <div>
          {s.heading && <h2 className="text-2xl font-bold tracking-tight">{s.heading}</h2>}
          {s.body && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-gray-600">{s.body}</p>}
        </div>
        {s.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.imageUrl} alt="" className="w-full rounded-2xl object-cover" />
        )}
      </div>
    </section>
  );
}

function GalleryBlock({ s }: { s: GallerySection }) {
  const imgs = (s.images || []).filter(Boolean);
  if (imgs.length === 0) return null;
  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      {s.heading && <h2 className="mb-6 text-2xl font-bold tracking-tight">{s.heading}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {imgs.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
        ))}
      </div>
    </section>
  );
}

function CtaBlock({ s, accent }: { s: CtaSection; accent: string }) {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-3xl rounded-3xl px-8 py-12 text-center text-white" style={{ background: accent }}>
        {s.heading && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.heading}</h2>}
        {s.subtext && <p className="mx-auto mt-3 max-w-xl text-white/85">{s.subtext}</p>}
        {s.buttonHref && s.buttonLabel && (
          <a href={s.buttonHref} className="mt-6 inline-flex h-11 items-center rounded-lg bg-white px-6 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90" style={{ color: accent }}>
            {s.buttonLabel}
          </a>
        )}
      </div>
    </section>
  );
}

function renderSection(s: WebsiteSection, site: PublicSiteInfo, accent: string) {
  switch (s.type) {
    case 'hero':
      return <HeroBlock key={s.id} s={s} accent={accent} fallbackTitle={site.businessName} />;
    case 'text':
      return <TextBlock key={s.id} s={s} />;
    case 'gallery':
      return <GalleryBlock key={s.id} s={s} />;
    case 'cta':
      return <CtaBlock key={s.id} s={s} accent={accent} />;
    case 'contact':
      return <ContactBlock key={s.id} site={site} accent={accent} heading={s.heading || 'Get in touch'} />;
    default:
      return null;
  }
}

export default function PublicSitePage({ site, canonicalUrl }: Props) {
  const accent = site.accentColor || '#2563eb';
  const title = site.businessName;
  const description = site.tagline || site.heroSubtext || site.about || site.businessName;
  const sections = (site.sections || []).filter((s) => s && s.enabled);
  const useSections = sections.length > 0;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        {site.heroImageUrl && <meta property="og:image" content={site.heroImageUrl} />}
        <meta name="twitter:card" content={site.heroImageUrl ? 'summary_large_image' : 'summary'} />
      </Head>

      <div className="min-h-screen bg-white text-gray-900">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2.5">
              {site.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={site.logoUrl} alt={site.businessName} className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: accent }}>
                  {initials(site.businessName)}
                </span>
              )}
              <span className="text-lg font-semibold tracking-tight">{site.businessName}</span>
            </div>
            {site.storefrontUrl && (
              <a href={site.storefrontUrl} className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: accent }}>
                Shop now
              </a>
            )}
          </div>
        </header>

        {useSections ? (
          sections.map((s) => renderSection(s, site, accent))
        ) : (
          <>
            {/* Fixed Phase-1 layout (no sections yet) */}
            <section className="relative overflow-hidden">
              {site.heroImageUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={site.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/45" />
                </>
              )}
              <div className={`relative mx-auto max-w-5xl px-5 ${site.heroImageUrl ? 'py-28 text-white' : 'py-24'}`}>
                <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">{site.heroHeadline || site.businessName}</h1>
                {(site.heroSubtext || site.tagline) && (
                  <p className={`mt-4 max-w-xl text-lg ${site.heroImageUrl ? 'text-white/85' : 'text-gray-600'}`}>{site.heroSubtext || site.tagline}</p>
                )}
                {site.storefrontUrl && (
                  <a href={site.storefrontUrl} className="mt-8 inline-flex h-11 items-center rounded-lg px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90" style={{ background: accent }}>
                    Shop now →
                  </a>
                )}
              </div>
            </section>

            {site.about && (
              <section className="mx-auto max-w-5xl px-5 py-16">
                <h2 className="text-2xl font-bold tracking-tight">About</h2>
                <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-gray-600">{site.about}</p>
              </section>
            )}

            <ContactBlock site={site} accent={accent} heading="Get in touch" />
          </>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-100">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-gray-500 sm:flex-row">
            <span>© {new Date().getFullYear()} {site.businessName}</span>
            <a href="https://kuza.africa" className="hover:text-gray-700">Powered by Kuza</a>
          </div>
        </footer>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, req }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const site = await fetchPublicSite(slug);
  if (!site) {
    return { notFound: true };
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host || '';
  const base = (process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`).replace(/\/$/, '');
  return { props: { site, canonicalUrl: `${base}/site/${slug}` } };
};
