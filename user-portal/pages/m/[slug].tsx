import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { fetchPublicMenu, PublicMenuData } from '@/lib/menu-public';
import { getTemplateComponent, resolveTheme } from '@/components/menu-templates';

interface Props {
  data: PublicMenuData | null;
  /** Absolute canonical URL for this menu, e.g. https://site/m/<slug>. */
  canonicalUrl: string | null;
}

/**
 * Build Restaurant + Menu JSON-LD from the public menu payload so each live
 * venue is eligible for local/rich results. Prices are only emitted when the
 * venue chooses to show them; unavailable items are dropped.
 */
function buildRestaurantJsonLd(
  data: PublicMenuData,
  canonicalUrl: string | null,
): Record<string, unknown> {
  const { venue, menus } = data;

  const menuSchemas = menus.map((menu) => ({
    '@type': 'Menu',
    name: menu.name,
    hasMenuSection: menu.categories.map((cat) => ({
      '@type': 'MenuSection',
      name: cat.name,
      ...(cat.description ? { description: cat.description } : {}),
      hasMenuItem: cat.items
        .filter((item) => item.isAvailable)
        .map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          ...(item.description ? { description: item.description } : {}),
          ...(item.imageUrl ? { image: item.imageUrl } : {}),
          ...(venue.showPrices
            ? {
                offers: {
                  '@type': 'Offer',
                  price: item.price,
                  priceCurrency: venue.currency,
                },
              }
            : {}),
        })),
    })),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: venue.name,
    ...(venue.tagline ? { description: venue.tagline } : {}),
    ...(canonicalUrl ? { url: canonicalUrl } : {}),
    ...(venue.logoUrl ? { image: venue.logoUrl } : {}),
    ...(venue.phone ? { telephone: venue.phone } : {}),
    ...(venue.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: venue.address,
          },
        }
      : {}),
    ...(menuSchemas.length ? { hasMenu: menuSchemas } : {}),
  };
}

/**
 * PUBLIC guest-facing menu page — what the QR code opens.
 * SSR-rendered so the menu is readable even with JS disabled; system fonts
 * only, no client data fetching, no auth, no cookies.
 *
 * NOTE FOR WIRING: components/Layout.tsx currently redirects unauthenticated
 * visitors to /login for any route other than /login,/register,/auth/callback.
 * The orchestrator must add a bypass for pathnames starting with '/m/'
 * (render bare children, like the auth pages) for this page to be publicly
 * reachable. This file is complete and self-contained either way.
 */
export default function PublicMenuPage({ data, canonicalUrl }: Props) {
  if (!data) {
    return (
      <>
        <Head>
          <title>Menu not live — Kuza Menu</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div
          className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
          style={{ backgroundColor: '#F6F7F9', color: '#14181F' }}
        >
          <div className="text-5xl" aria-hidden="true">
            🍽️
          </div>
          <h1 className="mt-4 text-xl font-bold">
            This menu isn&apos;t live yet
          </h1>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            The venue may have unpublished it, or the link may be wrong.
            Please ask a member of staff.
          </p>
          <a
            href="https://kuza.africa?utm_source=menu&utm_medium=404"
            className="mt-8 text-xs text-gray-400"
          >
            Powered by <span className="font-bold text-gray-600">Kuza</span>
          </a>
        </div>
      </>
    );
  }

  const { venue } = data;
  const theme = resolveTheme(venue.templateKey, venue.themeKey);
  const Template = getTemplateComponent(venue.templateKey);
  const title = venue.tagline
    ? `${venue.name} — ${venue.tagline}`
    : `${venue.name} — Menu`;
  const description = `Menu for ${venue.name}. ${venue.tagline || ''}`.trim();
  const restaurantLd = buildRestaurantJsonLd(data, canonicalUrl);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description} />
        <meta name="theme-color" content={theme.bg} />
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        {venue.logoUrl && <meta property="og:image" content={venue.logoUrl} />}
        {/* Twitter */}
        <meta
          name="twitter:card"
          content={venue.logoUrl ? 'summary_large_image' : 'summary'}
        />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {venue.logoUrl && (
          <meta name="twitter:image" content={venue.logoUrl} />
        )}
        {/* Restaurant + Menu structured data for local/rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantLd) }}
        />
      </Head>
      <Template data={data} theme={theme} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = typeof ctx.params?.slug === 'string' ? ctx.params.slug : '';
  const data = slug ? await fetchPublicMenu(slug) : null;

  // Absolute canonical URL: prefer the configured public site origin, else
  // fall back to the request's own host so live links stay correct anywhere.
  const proto =
    (ctx.req.headers['x-forwarded-proto'] as string)?.split(',')[0] || 'https';
  const host = ctx.req.headers.host;
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : '')
  ).replace(/\/+$/, '');
  const canonicalUrl = slug && base ? `${base}/m/${encodeURIComponent(slug)}` : null;

  if (data) {
    // Mirror the API's caching so CDN/proxy layers can serve repeat scans.
    ctx.res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300',
    );
  } else {
    ctx.res.statusCode = 404;
  }

  return {
    props: {
      data,
      canonicalUrl,
      // Layout (which currently wraps every page) calls useTranslation —
      // ship the common namespace so it never crashes on this route.
      ...(await serverSideTranslations(ctx.locale || 'en', ['common'])),
    },
  };
};
