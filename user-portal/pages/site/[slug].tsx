import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { fetchPublicSite, fetchStoreProducts, PublicSiteInfo } from '@/lib/site-public';
import { SiteBlock, ContactBlock, SiteContext, StoreProduct } from '@/components/website/SiteBlocks';

/**
 * Public website renderer — the marketing site a visitor sees at /site/:slug.
 * SSR from the published WebsiteSite. Self-contained (the dashboard Layout is
 * bypassed for /site/). Renders the ordered `sections` via the shared SiteBlock
 * renderers (same components the builder canvas uses → WYSIWYG); falls back to a
 * fixed hero → About → Contact layout when there are no sections.
 */

interface Props {
  site: PublicSiteInfo;
  canonicalUrl: string;
  products: StoreProduct[];
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function PublicSitePage({ site, canonicalUrl, products }: Props) {
  const accent = site.accentColor || '#2563eb';
  const title = site.businessName;
  const description = site.tagline || site.heroSubtext || site.about || site.businessName;
  const siteCtx: SiteContext = {
    businessName: site.businessName,
    whatsapp: site.whatsapp,
    instagram: site.instagram,
    phone: site.phone,
    email: site.email,
    address: site.address,
    products,
    storefrontUrl: site.storefrontUrl,
    currency: site.currency,
  };
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
              <a href={site.storefrontUrl} className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white" style={{ background: accent }}>
                Shop now
              </a>
            )}
          </div>
        </header>

        {useSections ? (
          sections.map((s) => <SiteBlock key={s.id} section={s} accent={accent} site={siteCtx} />)
        ) : (
          <>
            <section className="relative overflow-hidden">
              {site.heroImageUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={site.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/45" />
                </>
              )}
              <div className={`relative mx-auto max-w-5xl px-5 ${site.heroImageUrl ? 'py-24 text-white' : 'py-20'}`}>
                <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">{site.heroHeadline || site.businessName}</h1>
                {(site.heroSubtext || site.tagline) && (
                  <p className={`mt-4 max-w-xl text-lg ${site.heroImageUrl ? 'text-white/85' : 'text-gray-600'}`}>{site.heroSubtext || site.tagline}</p>
                )}
                {site.storefrontUrl && (
                  <a href={site.storefrontUrl} className="mt-8 inline-flex h-11 items-center rounded-lg px-6 text-sm font-semibold text-white shadow-sm" style={{ background: accent }}>
                    Shop now →
                  </a>
                )}
              </div>
            </section>

            {site.about && (
              <section className="mx-auto max-w-5xl px-5 py-14">
                <h2 className="text-2xl font-bold tracking-tight">About</h2>
                <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-gray-600">{site.about}</p>
              </section>
            )}

            <ContactBlock s={{ id: 'contact', type: 'contact', enabled: true, heading: 'Get in touch' }} accent={accent} site={siteCtx} />
          </>
        )}

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
  // If the page has a visible products block and a linked store, pull the store's
  // live products (SSR) from its public slug (…/s/<storeSlug>).
  let products: StoreProduct[] = [];
  const hasProductsBlock = (site.sections || []).some((s) => s?.type === 'products' && s.enabled);
  const storeSlug = site.storefrontUrl?.match(/\/s\/([a-z0-9-]+)/i)?.[1];
  if (hasProductsBlock && storeSlug) {
    products = await fetchStoreProducts(storeSlug);
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host || '';
  const base = (process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`).replace(/\/$/, '');
  return { props: { site, canonicalUrl: `${base}/site/${slug}`, products } };
};
