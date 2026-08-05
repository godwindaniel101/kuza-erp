import type {
  WebsiteSection,
  HeroSection,
  HeroVariant,
  TextSection,
  FeaturesSection,
  ProductsSection,
  GallerySection,
  CtaSection,
  ContactSection,
  Surface,
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
 *
 * Each block paints its own background via its `bg` surface (light / warm / dark
 * / tint) so a template can mix moods and read as designed, not uniformly white.
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

/** Class tokens + optional inline style for a section's background treatment. */
interface SurfaceTokens {
  section: string;
  heading: string;
  body: string;
  muted: string;
  card: string;
  cardRing: string;
  border: string;
  isDark: boolean;
  style?: React.CSSProperties;
}

function surfaceTokens(bg: Surface | undefined, accent: string): SurfaceTokens {
  switch (bg) {
    case 'dark':
      return {
        section: 'bg-gray-950 text-white', heading: 'text-white', body: 'text-white/70',
        muted: 'text-white/50', card: 'bg-white/[0.04]', cardRing: 'ring-white/10',
        border: 'border-white/10', isDark: true,
      };
    case 'warm':
      return {
        section: 'text-stone-900', heading: 'text-stone-900', body: 'text-stone-600',
        muted: 'text-stone-500', card: 'bg-white', cardRing: 'ring-stone-200/70',
        border: 'border-stone-200', isDark: false, style: { backgroundColor: '#faf6f1' },
      };
    case 'tint':
      return {
        section: 'text-gray-900', heading: 'text-gray-900', body: 'text-gray-600',
        muted: 'text-gray-500', card: 'bg-white', cardRing: 'ring-black/[0.06]',
        border: 'border-black/[0.06]', isDark: false,
        style: { background: `linear-gradient(180deg, ${accent}14, ${accent}06 60%, transparent)` },
      };
    default: // light
      return {
        section: 'bg-white text-gray-900', heading: 'text-gray-900', body: 'text-gray-600',
        muted: 'text-gray-400', card: 'bg-white', cardRing: 'ring-gray-100',
        border: 'border-gray-100', isDark: false,
      };
  }
}

/** Small uppercase eyebrow above a hero/section headline. */
function Eyebrow({ text, accent, onDark }: { text?: string; accent: string; onDark?: boolean }) {
  if (!text) return null;
  return (
    <span
      className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.18em]"
      style={{ color: onDark ? '#ffffffcc' : accent }}
    >
      {text}
    </span>
  );
}

/** Primary hero call-to-action button, shared across the three hero variants. */
function HeroCta({ s, accent }: { s: HeroSection; accent: string }) {
  if (!(s.ctaHref && s.ctaLabel)) return null;
  return (
    <a
      href={s.ctaHref}
      className="group inline-flex h-12 items-center gap-2 rounded-xl px-7 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
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
  const tok = surfaceTokens(s.bg, accent);

  /* ── Split: text beside image ── */
  if (variant === 'split') {
    return (
      <section className={`grid items-stretch md:grid-cols-2 ${tok.section}`} style={tok.style}>
        <div className="flex flex-col justify-center px-6 py-16 sm:px-10 md:px-14 md:py-24">
          <Eyebrow text={s.eyebrow} accent={accent} onDark={tok.isDark} />
          <h1 className={`text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl ${tok.heading}`}>{headline}</h1>
          {s.subtext && <p className={`mt-5 max-w-md text-lg leading-relaxed ${tok.body}`}>{s.subtext}</p>}
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

  /* ── Centered: text on a soft accent glow, optional framed image ── */
  if (variant === 'centered') {
    const centeredStyle = tok.isDark
      ? { background: `radial-gradient(120% 80% at 50% 0%, ${accent}33, transparent 60%), #0a0a0a` }
      : tok.style || { background: `linear-gradient(180deg, ${accent}1f, ${accent}08 45%, transparent)` };
    return (
      <section className={`relative overflow-hidden ${tok.section}`} style={centeredStyle}>
        <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-20 text-center sm:pt-28">
          <Eyebrow text={s.eyebrow} accent={accent} onDark={tok.isDark} />
          <h1 className={`mx-auto max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl ${tok.heading}`}>{headline}</h1>
          {s.subtext && <p className={`mx-auto mt-5 max-w-xl text-lg leading-relaxed ${tok.body}`}>{s.subtext}</p>}
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
    <section className={`relative overflow-hidden ${hasImg ? '' : tok.section}`} style={hasImg ? undefined : tok.style}>
      {hasImg && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20" />
        </>
      )}
      <div className={`relative mx-auto max-w-5xl px-5 ${hasImg ? 'py-32 text-white sm:py-40' : 'py-24'}`}>
        <Eyebrow text={s.eyebrow} accent={accent} onDark={hasImg || tok.isDark} />
        <h1 className={`max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl ${hasImg ? '' : tok.heading}`}>{headline}</h1>
        {s.subtext && <p className={`mt-5 max-w-xl text-lg leading-relaxed ${hasImg ? 'text-white/90' : tok.body}`}>{s.subtext}</p>}
        <div className="mt-8"><HeroCta s={s} accent={accent} /></div>
      </div>
    </section>
  );
}

export function TextBlock({ s, accent }: { s: TextSection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  return (
    <section className={tok.section} style={tok.style}>
      <div className={`mx-auto max-w-5xl px-5 py-16 sm:py-20`}>
        <div className={`grid items-center gap-10 ${s.imageUrl ? 'md:grid-cols-2' : 'max-w-3xl'}`}>
          <div>
            {s.heading && <h2 className={`text-3xl font-bold leading-tight tracking-tight ${tok.heading}`}>{s.heading}</h2>}
            {s.body && <p className={`mt-5 whitespace-pre-line text-base leading-relaxed ${tok.body}`}>{s.body}</p>}
          </div>
          {s.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl ring-1 ring-black/5" />
          )}
        </div>
      </div>
    </section>
  );
}

export function FeaturesBlock({ s, accent }: { s: FeaturesSection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  const items = (s.items || []).filter((i) => i && (i.title || i.body));
  const layout = s.layout || 'cards';
  if (items.length === 0) return null;

  return (
    <section className={tok.section} style={tok.style}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        {(s.heading || s.subtext) && (
          <div className="max-w-2xl">
            {s.heading && <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${tok.heading}`}>{s.heading}</h2>}
            {s.subtext && <p className={`mt-4 text-lg leading-relaxed ${tok.body}`}>{s.subtext}</p>}
          </div>
        )}

        {/* Numbered rows — 01 / 02 / 03 */}
        {layout === 'numbered' && (
          <div className={`mt-12 divide-y ${tok.border}`}>
            {items.map((f, i) => (
              <div key={i} className="grid grid-cols-[auto,1fr] gap-6 py-7 sm:grid-cols-[6rem,1fr] sm:gap-10">
                <span className="text-3xl font-bold tabular-nums sm:text-4xl" style={{ color: accent }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className={`text-lg font-semibold ${tok.heading}`}>{f.title}</h3>
                  {f.body && <p className={`mt-2 max-w-xl text-[15px] leading-relaxed ${tok.body}`}>{f.body}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Icon grid */}
        {layout === 'icons' && (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f, i) => (
              <div key={i}>
                <span
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                  style={{ background: `${accent}1a`, color: accent }}
                >
                  <i className={`bx ${f.icon || 'bx-check'}`} aria-hidden="true" />
                </span>
                <h3 className={`text-base font-semibold ${tok.heading}`}>{f.title}</h3>
                {f.body && <p className={`mt-2 text-[15px] leading-relaxed ${tok.body}`}>{f.body}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Cards (default) */}
        {layout === 'cards' && (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f, i) => (
              <div key={i} className={`rounded-2xl p-6 ring-1 ${tok.card} ${tok.cardRing}`}>
                {f.icon && (
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-xl" style={{ background: `${accent}1a`, color: accent }}>
                    <i className={`bx ${f.icon}`} aria-hidden="true" />
                  </span>
                )}
                <h3 className={`text-base font-semibold ${tok.heading}`}>{f.title}</h3>
                {f.body && <p className={`mt-2 text-[15px] leading-relaxed ${tok.body}`}>{f.body}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function GalleryBlock({ s, accent }: { s: GallerySection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  const imgs = (s.images || []).filter(Boolean);
  return (
    <section className={tok.section} style={tok.style}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        {s.heading && <h2 className={`mb-8 text-3xl font-bold tracking-tight ${tok.heading}`}>{s.heading}</h2>}
        {imgs.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`aspect-square w-full rounded-2xl ${tok.isDark ? 'bg-white/5' : 'bg-gray-100'}`} />
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
      </div>
    </section>
  );
}

export function CtaBlock({ s, accent }: { s: CtaSection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  return (
    <section className={tok.section} style={tok.style}>
      <div className="px-5 py-16 sm:py-20">
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
      </div>
    </section>
  );
}

export function ContactBlock({ s, accent, site }: { s: ContactSection; accent: string; site: SiteContext }) {
  const tok = surfaceTokens(s.bg, accent);
  const igHandle = site.instagram?.replace(/^@/, '');
  const waDigits = site.whatsapp?.replace(/[^\d]/g, '');
  const hasAny = !!(site.phone || site.email || waDigits || igHandle || site.address);
  const cardClass = `flex items-center gap-3 rounded-xl p-4 ring-1 ${tok.card} ${tok.cardRing}`;
  return (
    <section className={`border-t ${tok.border} ${s.bg ? tok.section : 'bg-gray-50'}`} style={s.bg ? tok.style : undefined}>
      <div className="mx-auto max-w-5xl px-5 py-14">
        <h2 className={`text-2xl font-bold tracking-tight ${tok.heading}`}>{s.heading || 'Get in touch'}</h2>
        {!hasAny ? (
          <p className={`mt-4 text-sm ${tok.muted}`}>Add your WhatsApp, phone, email or address in the page settings.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {waDigits && (
              <a href={`https://wa.me/${waDigits}`} className={cardClass}>
                <i className="bx bxl-whatsapp text-2xl" style={{ color: accent }} aria-hidden="true" />
                <span className={`text-sm font-medium ${tok.heading}`}>{site.whatsapp}</span>
              </a>
            )}
            {igHandle && (
              <a href={`https://instagram.com/${igHandle}`} className={cardClass}>
                <i className="bx bxl-instagram text-2xl" style={{ color: accent }} aria-hidden="true" />
                <span className={`text-sm font-medium ${tok.heading}`}>@{igHandle}</span>
              </a>
            )}
            {site.phone && (
              <a href={`tel:${site.phone}`} className={cardClass}>
                <i className="bx bx-phone text-2xl" style={{ color: accent }} aria-hidden="true" />
                <span className={`text-sm font-medium ${tok.heading}`}>{site.phone}</span>
              </a>
            )}
            {site.email && (
              <a href={`mailto:${site.email}`} className={cardClass}>
                <i className="bx bx-envelope text-2xl" style={{ color: accent }} aria-hidden="true" />
                <span className={`text-sm font-medium ${tok.heading}`}>{site.email}</span>
              </a>
            )}
            {site.address && (
              <div className={`${cardClass} sm:col-span-2`}>
                <i className="bx bx-map text-2xl" style={{ color: accent }} aria-hidden="true" />
                <span className={`text-sm font-medium ${tok.heading}`}>{site.address}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function ProductsBlock({ s, accent, site }: { s: ProductsSection; accent: string; site: SiteContext }) {
  const tok = surfaceTokens(s.bg, accent);
  const products = (site.products || []).slice(0, s.limit || 6);
  const shopHref = site.storefrontUrl || undefined;
  const placeholder = products.length === 0;
  const cells = placeholder ? Array.from({ length: Math.min(s.limit || 6, 6) }, (_, i) => i) : products;
  const skeletonBg = tok.isDark ? 'bg-white/10' : 'bg-gray-100';
  return (
    <section className={tok.section} style={tok.style}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        {s.heading && <h2 className={`mb-8 text-3xl font-bold tracking-tight ${tok.heading}`}>{s.heading}</h2>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {placeholder
            ? (cells as number[]).map((i) => (
                <div key={i} className={`overflow-hidden rounded-2xl ring-1 ${tok.cardRing}`}>
                  <div className={`aspect-square ${skeletonBg}`} />
                  <div className="p-3"><div className={`h-3 w-2/3 rounded ${skeletonBg}`} /><div className={`mt-2 h-3 w-1/3 rounded ${skeletonBg}`} /></div>
                </div>
              ))
            : (cells as StoreProduct[]).map((p) => (
                <a key={p.id} href={shopHref} className={`group overflow-hidden rounded-2xl ring-1 transition hover:-translate-y-0.5 hover:shadow-lg ${tok.card} ${tok.cardRing}`}>
                  <div className={`aspect-square overflow-hidden ${tok.isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300"><i className="bx bx-image text-3xl" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className={`truncate text-sm font-medium ${tok.heading}`}>{p.name}</p>
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: accent }}>{formatMoney(p.price, site.currency || 'NGN')}</p>
                  </div>
                </a>
              ))}
        </div>
        {placeholder && (
          <p className={`mt-4 text-center text-xs ${tok.muted}`}>Live products from your store appear here once it has stock.</p>
        )}
        {!placeholder && shopHref && (
          <div className="mt-6 text-center">
            <a href={shopHref} className="inline-flex h-10 items-center rounded-lg px-5 text-sm font-semibold text-white" style={{ background: accent }}>View all products</a>
          </div>
        )}
      </div>
    </section>
  );
}

/** Render any block by type. */
export function SiteBlock({ section, accent, site }: { section: WebsiteSection; accent: string; site: SiteContext }) {
  switch (section.type) {
    case 'hero':
      return <HeroBlock s={section} accent={accent} site={site} />;
    case 'text':
      return <TextBlock s={section} accent={accent} />;
    case 'features':
      return <FeaturesBlock s={section} accent={accent} />;
    case 'products':
      return <ProductsBlock s={section} accent={accent} site={site} />;
    case 'gallery':
      return <GalleryBlock s={section} accent={accent} />;
    case 'cta':
      return <CtaBlock s={section} accent={accent} />;
    case 'contact':
      return <ContactBlock s={section} accent={accent} site={site} />;
    default:
      return null;
  }
}
