import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { fetchPublicSite, PublicSiteInfo } from '@/lib/site-public';

/**
 * Public website renderer — the marketing site a visitor sees at /site/:slug.
 * Server-rendered from the published WebsiteSite (SSR fetch → /api/public/site/:slug).
 * Fully self-contained (the dashboard Layout is bypassed for /site/ routes). Its
 * "Shop now" button links to the tenant's Storefront (storefrontUrl).
 *
 * Phase 1: a single, clean template (hero → about → contact → footer). The
 * section editor + multiple templates arrive in Phase 2.
 */

interface Props {
  site: PublicSiteInfo;
  canonicalUrl: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function PublicSitePage({ site, canonicalUrl }: Props) {
  const accent = site.accentColor || '#2563eb';
  const title = site.businessName;
  const description = site.tagline || site.heroSubtext || site.about || site.businessName;
  const igHandle = site.instagram?.replace(/^@/, '');
  const waDigits = site.whatsapp?.replace(/[^\d]/g, '');

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

      <div className="min-h-screen bg-white text-gray-900" style={{ ['--accent' as any]: accent }}>
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
              <a
                href={site.storefrontUrl}
                className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: accent }}
              >
                Shop now
              </a>
            )}
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden">
          {site.heroImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={site.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/45" />
            </>
          )}
          <div className={`relative mx-auto max-w-5xl px-5 ${site.heroImageUrl ? 'py-28 text-white' : 'py-24'}`}>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
              {site.heroHeadline || site.businessName}
            </h1>
            {(site.heroSubtext || site.tagline) && (
              <p className={`mt-4 max-w-xl text-lg ${site.heroImageUrl ? 'text-white/85' : 'text-gray-600'}`}>
                {site.heroSubtext || site.tagline}
              </p>
            )}
            {site.storefrontUrl && (
              <a
                href={site.storefrontUrl}
                className="mt-8 inline-flex h-11 items-center rounded-lg px-6 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ background: accent }}
              >
                Shop now →
              </a>
            )}
          </div>
        </section>

        {/* About */}
        {site.about && (
          <section className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="text-2xl font-bold tracking-tight">About</h2>
            <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-gray-600">{site.about}</p>
          </section>
        )}

        {/* Contact */}
        {(site.phone || site.email || site.whatsapp || igHandle || site.address) && (
          <section className="border-t border-gray-100 bg-gray-50">
            <div className="mx-auto max-w-5xl px-5 py-16">
              <h2 className="text-2xl font-bold tracking-tight">Get in touch</h2>
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
