import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { fetchPublicMenu, PublicMenuData } from '@/lib/menu-public';
import { getTemplateComponent, resolveTheme } from '@/components/menu-templates';

interface Props {
  data: PublicMenuData | null;
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
export default function PublicMenuPage({ data }: Props) {
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

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content={`Menu for ${venue.name}. ${venue.tagline || ''}`.trim()}
        />
        <meta name="theme-color" content={theme.bg} />
        <meta property="og:title" content={title} />
        <meta property="og:type" content="website" />
        {venue.logoUrl && <meta property="og:image" content={venue.logoUrl} />}
      </Head>
      <Template data={data} theme={theme} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = typeof ctx.params?.slug === 'string' ? ctx.params.slug : '';
  const data = slug ? await fetchPublicMenu(slug) : null;

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
      // Layout (which currently wraps every page) calls useTranslation —
      // ship the common namespace so it never crashes on this route.
      ...(await serverSideTranslations(ctx.locale || 'en', ['common'])),
    },
  };
};
