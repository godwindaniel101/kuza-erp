import type {
  WebsiteSection,
  HeroSection,
  HeroVariant,
  TextSection,
  ProductsSection,
  GallerySection,
  CtaSection,
  ContactSection,
} from '@/lib/website-sections';
import { formatMoney } from '@/lib/format';

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

/**
 * Shared, presentational renderers for website builder blocks. Used by BOTH the
 * public page (pages/site/[slug].tsx) and the builder's live canvas, so the
 * editor is true WYSIWYG. Pure — no editing affordances live here.
 */

/** The site-level fields a block may need (contact details, hero fallback). */
export interface SiteContext {
  businessName: string;
  whatsapp?: string | null;
  instagram?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  /** Live products pulled from the linked Storefront (for the products block). */
  products?: StoreProduct[];
  storefrontUrl?: string | null;
  currency?: string;
}

/** Primary hero call-to-action button, shared across the three hero variants. */
function HeroCta({ s, accent, onLight }: { s: HeroSection; accent: string; onLight?: boolean }) {
  if (!(s.ctaHref && s.ctaLabel)) return null;
  return (
    <a
      href={s.ctaHref}
      className={`group inline-flex h-12 items-center gap-2 rounded-xl px-7 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5 ${
        onLight ? 'text-white' : 'text-white'
      }`}
      style={{ background: accent, boxShadow: `0 12px 30px -12px ${accent}` }}
    >
      {s.ctaLabel}
      <i className="bx bx-right-arrow-alt text-lg transition group-hover:translate-x-0.5" aria-hidden="true" />
    </a>
  );
}

export function HeroBlock({ s, accent, site }: { s: HeroSection; accent: string; site: SiteContext }) {
  const variant: HeroVariant = s.variant || 'fullbleed';
  const headline = s.headline || site.businessName;

  /* ── Split: text beside image ── */
  if (variant === 'split') {
    return (
      <section className="grid items-stretch md:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-16 sm:px-10 md:px-14 md:py-24">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-gray-900 sm:text-5xl">{headline}</h1>
          {s.subtext && <p className="mt-5 max-w-md text-lg leading-relaxed text-gray-600">{s.subtext}</p>}
          <div className="mt-8"><HeroCta s={s} accent={accent} /></div>
        </div>
        <div className="relative min-h-[300px] overflow-hidden md:min-h-[560px]">
          {s.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }} />
          )}
        </div>
      </section>
    );
  }

  /* ── Centered: text on a soft accent gradient, optional framed image ── */
  if (variant === 'centered') {
    return (
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${accent}1f, ${accent}08 45%, transparent)` }}>
        <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-20 text-center sm:pt-28">
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight text-gray-900 sm:text-6xl">{headline}</h1>
          {s.subtext && <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-gray-600">{s.subtext}</p>}
          <div className="mt-8 flex justify-center"><HeroCta s={s} accent={accent} /></div>
          {s.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className="mt-14 aspect-[16/9] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-black/5" />
          )}
        </div>
      </section>
    );
  }

  /* ── Full-bleed (default): image + overlay, or plain when no image ── */
  const hasImg = !!s.imageUrl;
  return (
    <section className="relative overflow-hidden">
      {hasImg && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20" />
        </>
      )}
      <div className={`relative mx-auto max-w-5xl px-5 ${hasImg ? 'py-32 text-white sm:py-40' : 'py-24'}`}>
        <h1 className={`max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl ${hasImg ? '' : 'text-gray-900'}`}>{headline}</h1>
        {s.subtext && <p className={`mt-5 max-w-xl text-lg leading-relaxed ${hasImg ? 'text-white/90' : 'text-gray-600'}`}>{s.subtext}</p>}
        <div className="mt-8"><HeroCta s={s} accent={accent} onLight={hasImg} /></div>
      </div>
    </section>
  );
}

export function TextBlock({ s }: { s: TextSection }) {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
      <div className={`grid items-center gap-10 ${s.imageUrl ? 'md:grid-cols-2' : 'max-w-3xl'}`}>
        <div>
          {s.heading && <h2 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">{s.heading}</h2>}
          {s.body && <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-gray-600">{s.body}</p>}
        </div>
        {s.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.imageUrl} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl ring-1 ring-black/5" />
        )}
      </div>
    </section>
  );
}

export function GalleryBlock({ s }: { s: GallerySection }) {
  const imgs = (s.images || []).filter(Boolean);
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      {s.heading && <h2 className="mb-8 text-3xl font-bold tracking-tight text-gray-900">{s.heading}</h2>}
      {imgs.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square w-full rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {imgs.map((src, i) => (
            <div key={i} className="group overflow-hidden rounded-2xl ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function CtaBlock({ s, accent }: { s: CtaSection; accent: string }) {
  return (
    <section className="px-5 py-16 sm:py-20">
      <div
        className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] px-8 py-16 text-center text-white shadow-2xl"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative">
          {s.heading && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{s.heading}</h2>}
          {s.subtext && <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">{s.subtext}</p>}
          {s.buttonHref && s.buttonLabel && (
            <a href={s.buttonHref} className="mt-8 inline-flex h-12 items-center rounded-xl bg-white px-7 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5" style={{ color: accent }}>
              {s.buttonLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function ContactBlock({ s, accent, site }: { s: ContactSection; accent: string; site: SiteContext }) {
  const igHandle = site.instagram?.replace(/^@/, '');
  const waDigits = site.whatsapp?.replace(/[^\d]/g, '');
  const hasAny = !!(site.phone || site.email || waDigits || igHandle || site.address);
  return (
    <section className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-2xl font-bold tracking-tight">{s.heading || 'Get in touch'}</h2>
        {!hasAny ? (
          <p className="mt-4 text-sm text-gray-400">Add your WhatsApp, phone, email or address in the page settings.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {waDigits && (
              <a href={`https://wa.me/${waDigits}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
                <i className="bx bxl-whatsapp text-2xl" style={{ color: accent }} aria-hidden="true" />
                <span className="text-sm font-medium">{site.whatsapp}</span>
              </a>
            )}
            {igHandle && (
              <a href={`https://instagram.com/${igHandle}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
                <i className="bx bxl-instagram text-2xl" style={{ color: accent }} aria-hidden="true" />
                <span className="text-sm font-medium">@{igHandle}</span>
              </a>
            )}
            {site.phone && (
              <a href={`tel:${site.phone}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
                <i className="bx bx-phone text-2xl" style={{ color: accent }} aria-hidden="true" />
                <span className="text-sm font-medium">{site.phone}</span>
              </a>
            )}
            {site.email && (
              <a href={`mailto:${site.email}`} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
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
        )}
      </div>
    </section>
  );
}

export function ProductsBlock({ s, accent, site }: { s: ProductsSection; accent: string; site: SiteContext }) {
  const products = (site.products || []).slice(0, s.limit || 6);
  const shopHref = site.storefrontUrl || undefined;
  const placeholder = products.length === 0;
  const cells = placeholder ? Array.from({ length: Math.min(s.limit || 6, 6) }, (_, i) => i) : products;
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      {s.heading && <h2 className="mb-8 text-3xl font-bold tracking-tight text-gray-900">{s.heading}</h2>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {placeholder
          ? (cells as number[]).map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl ring-1 ring-gray-100">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3"><div className="h-3 w-2/3 rounded bg-gray-100" /><div className="mt-2 h-3 w-1/3 rounded bg-gray-100" /></div>
              </div>
            ))
          : (cells as StoreProduct[]).map((p) => (
              <a key={p.id} href={shopHref} className="group overflow-hidden rounded-2xl ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-gray-200">
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
                  <p className="mt-0.5 text-sm font-semibold" style={{ color: accent }}>{formatMoney(p.price, site.currency || 'NGN')}</p>
                </div>
              </a>
            ))}
      </div>
      {placeholder && (
        <p className="mt-4 text-center text-xs text-gray-400">Live products from your store appear here once it has stock.</p>
      )}
      {!placeholder && shopHref && (
        <div className="mt-6 text-center">
          <a href={shopHref} className="inline-flex h-10 items-center rounded-lg px-5 text-sm font-semibold text-white" style={{ background: accent }}>View all products</a>
        </div>
      )}
    </section>
  );
}

/** Render any block by type. */
export function SiteBlock({ section, accent, site }: { section: WebsiteSection; accent: string; site: SiteContext }) {
  switch (section.type) {
    case 'hero':
      return <HeroBlock s={section} accent={accent} site={site} />;
    case 'text':
      return <TextBlock s={section} />;
    case 'products':
      return <ProductsBlock s={section} accent={accent} site={site} />;
    case 'gallery':
      return <GalleryBlock s={section} />;
    case 'cta':
      return <CtaBlock s={section} accent={accent} />;
    case 'contact':
      return <ContactBlock s={section} accent={accent} site={site} />;
    default:
      return null;
  }
}
