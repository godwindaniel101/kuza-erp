import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { formatMoney } from '@/lib/format';

/**
 * Public storefront page — the shop a visitor sees at /s/:slug. SSR from the
 * public store payload (GET /api/public/store/:slug, @Public). Self-contained:
 * the dashboard Layout is bypassed for /s/ (see components/Layout.tsx). Mirrors
 * the website renderer at pages/site/[slug].tsx.
 */

interface StoreProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
}

interface StoreInfo {
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  showPrices: boolean;
  whatsapp: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  slug: string;
}

interface Props {
  store: StoreInfo;
  products: StoreProduct[];
  canonicalUrl: string;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function PublicStorePage({ store, products, canonicalUrl }: Props) {
  const accent = store.accentColor || '#2563eb';
  const igHandle = store.instagram?.replace(/^@/, '');
  const waDigits = store.whatsapp?.replace(/[^\d]/g, '');
  const description = store.description || `Shop ${store.storeName}`;

  return (
    <>
      <Head>
        <title>{store.storeName}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={store.storeName} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        {store.heroImageUrl && <meta property="og:image" content={store.heroImageUrl} />}
        <meta name="twitter:card" content={store.heroImageUrl ? 'summary_large_image' : 'summary'} />
      </Head>

      <div className="min-h-screen bg-white text-gray-900">
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt={store.storeName} className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: accent }}>
                  {initials(store.storeName)}
                </span>
              )}
              <span className="truncate text-lg font-semibold tracking-tight">{store.storeName}</span>
            </div>
            {waDigits && (
              <a href={`https://wa.me/${waDigits}`} className="inline-flex h-9 shrink-0 items-center rounded-lg px-4 text-sm font-semibold text-white" style={{ background: accent }}>
                Order on WhatsApp
              </a>
            )}
          </div>
        </header>

        <section className="relative overflow-hidden">
          {store.heroImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={store.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/45" />
            </>
          )}
          <div className={`relative mx-auto max-w-5xl px-5 ${store.heroImageUrl ? 'py-20 text-white sm:py-28' : 'py-14'}`}>
            <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">{store.storeName}</h1>
            {store.description && (
              <p className={`mt-4 max-w-xl text-lg ${store.heroImageUrl ? 'text-white/85' : 'text-gray-600'}`}>{store.description}</p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">Products</h2>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
              <i className="bx bx-store text-4xl" />
              <p className="mt-3 text-sm">This store has no products listed yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <div key={p.id} className="group overflow-hidden rounded-2xl ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="aspect-square overflow-hidden bg-gray-50">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300"><i className="bx bx-image text-3xl" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                    {store.showPrices && (
                      <p className="mt-0.5 text-sm font-semibold" style={{ color: accent }}>{formatMoney(p.price, store.currency || 'NGN')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {(waDigits || igHandle || store.phone || store.email) && (
          <section className="border-t border-gray-100 bg-gray-50">
            <div className="mx-auto max-w-5xl px-5 py-12">
              <h2 className="text-xl font-bold tracking-tight">Get in touch</h2>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {waDigits && (
                  <a href={`https://wa.me/${waDigits}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
                    <i className="bx bxl-whatsapp text-2xl" style={{ color: accent }} aria-hidden="true" />
                    <span className="text-sm font-medium">{store.whatsapp}</span>
                  </a>
                )}
                {igHandle && (
                  <a href={`https://instagram.com/${igHandle}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
                    <i className="bx bxl-instagram text-2xl" style={{ color: accent }} aria-hidden="true" />
                    <span className="text-sm font-medium">@{igHandle}</span>
                  </a>
                )}
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
                    <i className="bx bx-phone text-2xl" style={{ color: accent }} aria-hidden="true" />
                    <span className="text-sm font-medium">{store.phone}</span>
                  </a>
                )}
                {store.email && (
                  <a href={`mailto:${store.email}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
                    <i className="bx bx-envelope text-2xl" style={{ color: accent }} aria-hidden="true" />
                    <span className="text-sm font-medium">{store.email}</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        <footer className="border-t border-gray-100">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-gray-500 sm:flex-row">
            <span>© {new Date().getFullYear()} {store.storeName}</span>
            <a href="https://kuza.africa" className="hover:text-gray-700">Powered by Kuza</a>
          </div>
        </footer>
      </div>
    </>
  );
}

const PUBLIC_API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

function absImage(src?: string | null): string | null {
  if (!src) return null;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return `${PUBLIC_API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`;
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, req }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const configured = process.env.SSR_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
  const candidates = [configured];
  if (/localhost|127\.0\.0\.1/.test(configured)) {
    candidates.push(configured.replace(/localhost|127\.0\.0\.1/, 'host.docker.internal'));
  }

  let payload: { store: StoreInfo; products: StoreProduct[] } | null = null;
  for (const base of candidates) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/public/store/${encodeURIComponent(slug)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const store = json?.data?.store;
      const products = json?.data?.products;
      if (json?.success && store?.storeName) {
        payload = {
          store: { ...store, logoUrl: absImage(store.logoUrl), heroImageUrl: absImage(store.heroImageUrl) },
          products: (Array.isArray(products) ? products : []).map((p: StoreProduct) => ({ ...p, imageUrl: absImage(p.imageUrl) })),
        };
        break;
      }
    } catch {
      // try the next candidate (e.g. host.docker.internal from inside Docker)
    }
  }

  if (!payload) return { notFound: true };

  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host || '';
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`).replace(/\/$/, '');
  return { props: { ...payload, canonicalUrl: `${siteBase}/s/${slug}` } };
};
