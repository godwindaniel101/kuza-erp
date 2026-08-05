import type {
  WebsiteSection,
  HeroSection,
  HeroVariant,
  TextSection,
  FeaturesSection,
  StatsSection,
  ProductsSection,
  MenuSection,
  GallerySection,
  TestimonialSection,
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
 * Each block paints its own background via `bg` (light / warm / dark / tint) AND
 * branches on a per-type `variant` for a genuinely different LAYOUT — so two
 * templates using the same block types still render as different websites.
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

/** Primary hero call-to-action button, shared across the hero variants. */
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

/* ───────────────────────────── HERO ───────────────────────────── */
export function HeroBlock({ s, accent, site }: { s: HeroSection; accent: string; site: SiteContext }) {
  const variant: HeroVariant = s.variant || 'fullbleed';
  const headline = s.headline || site.businessName;
  const tok = surfaceTokens(s.bg, accent);

  if (variant === 'minimal') {
    return (
      <section className={`relative overflow-hidden ${tok.section}`} style={tok.style}>
        <div className="mx-auto max-w-5xl px-5 py-24 sm:py-32">
          <div className="h-px w-16" style={{ background: accent }} />
          <Eyebrow text={s.eyebrow} accent={accent} onDark={tok.isDark} />
          <h1 className={`mt-6 max-w-4xl text-5xl font-bold leading-[0.98] tracking-tight sm:text-7xl ${tok.heading}`}>{headline}</h1>
          {s.subtext && <p className={`mt-6 max-w-xl text-lg leading-relaxed ${tok.body}`}>{s.subtext}</p>}
          <div className="mt-10"><HeroCta s={s} accent={accent} /></div>
        </div>
      </section>
    );
  }

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

  /* full-bleed (default): image + overlay, or plain when no image */
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

/* ───────────────────────────── TEXT ───────────────────────────── */
export function TextBlock({ s, accent }: { s: TextSection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  const variant = s.variant || (s.imageUrl ? 'image-right' : 'statement');

  if (variant === 'statement') {
    return (
      <section className={tok.section} style={tok.style}>
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
          {s.heading && <h2 className={`text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl ${tok.heading}`}>{s.heading}</h2>}
          {s.body && <p className={`mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed ${tok.body}`}>{s.body}</p>}
        </div>
      </section>
    );
  }

  if (variant === 'quote') {
    return (
      <section className={tok.section} style={tok.style}>
        <div className="mx-auto max-w-4xl px-5 py-20 sm:py-28">
          <i className="bx bxs-quote-left text-5xl" style={{ color: accent }} aria-hidden="true" />
          <p className={`mt-4 text-2xl font-medium leading-snug tracking-tight sm:text-4xl ${tok.heading}`}>{s.body}</p>
          {s.heading && <p className={`mt-6 text-sm font-semibold uppercase tracking-wide ${tok.muted}`}>{s.heading}</p>}
        </div>
      </section>
    );
  }

  const reverse = variant === 'image-left';
  return (
    <section className={tok.section} style={tok.style}>
      <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
        <div className={`grid items-center gap-10 ${s.imageUrl ? 'md:grid-cols-2' : 'max-w-3xl'}`}>
          <div className={reverse ? 'md:order-2' : ''}>
            {s.heading && <h2 className={`text-3xl font-bold leading-tight tracking-tight ${tok.heading}`}>{s.heading}</h2>}
            {s.body && <p className={`mt-5 whitespace-pre-line text-base leading-relaxed ${tok.body}`}>{s.body}</p>}
          </div>
          {s.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt="" className={`aspect-[4/3] w-full rounded-3xl object-cover shadow-xl ring-1 ring-black/5 ${reverse ? 'md:order-1' : ''}`} />
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FEATURES ─────────────────────────── */
export function FeaturesBlock({ s, accent }: { s: FeaturesSection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  const items = (s.items || []).filter((i) => i && (i.title || i.body));
  const layout = s.layout || 'cards';
  if (items.length === 0) return null;

  const Header = (s.heading || s.subtext) && layout !== 'split' && (
    <div className="max-w-2xl">
      {s.heading && <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${tok.heading}`}>{s.heading}</h2>}
      {s.subtext && <p className={`mt-4 text-lg leading-relaxed ${tok.body}`}>{s.subtext}</p>}
    </div>
  );

  return (
    <section className={tok.section} style={tok.style}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        {Header}

        {layout === 'numbered' && items.some((f) => f.image) && (
          /* alternating image ⇆ text rows (zigzag) */
          <div className="mt-12 space-y-6 sm:space-y-10">
            {items.map((f, i) => (
              <div key={i} className="grid items-center gap-6 sm:grid-cols-2 sm:gap-12">
                <div className={`overflow-hidden rounded-2xl ${i % 2 === 1 ? 'sm:order-2' : ''} ${tok.isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                  {f.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.image} alt="" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="aspect-[4/3] w-full" style={{ background: `${accent}14` }} />
                  )}
                </div>
                <div className={i % 2 === 1 ? 'sm:order-1' : ''}>
                  <span className="text-4xl font-bold tabular-nums sm:text-5xl" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 className={`mt-3 text-2xl font-semibold tracking-tight ${tok.heading}`}>{f.title}</h3>
                  {f.body && <p className={`mt-3 max-w-md text-[15px] leading-relaxed ${tok.body}`}>{f.body}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {layout === 'numbered' && !items.some((f) => f.image) && (
          <div className={`mt-12 divide-y ${tok.border}`}>
            {items.map((f, i) => (
              <div key={i} className="grid grid-cols-[auto,1fr] items-start gap-6 py-7 sm:grid-cols-[6rem,1fr] sm:gap-10">
                <span className="text-3xl font-bold tabular-nums sm:text-4xl" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
                <div className="flex items-start gap-4">
                  {f.icon && (
                    <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl sm:flex" style={{ background: `${accent}1a`, color: accent }}>
                      <i className={`bx ${f.icon}`} aria-hidden="true" />
                    </span>
                  )}
                  <div>
                    <h3 className={`text-lg font-semibold ${tok.heading}`}>{f.title}</h3>
                    {f.body && <p className={`mt-2 max-w-xl text-[15px] leading-relaxed ${tok.body}`}>{f.body}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {layout === 'icons' && (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f, i) => (
              <div key={i}>
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: `${accent}1a`, color: accent }}>
                  <i className={`bx ${f.icon || 'bx-check'}`} aria-hidden="true" />
                </span>
                <h3 className={`text-base font-semibold ${tok.heading}`}>{f.title}</h3>
                {f.body && <p className={`mt-2 text-[15px] leading-relaxed ${tok.body}`}>{f.body}</p>}
              </div>
            ))}
          </div>
        )}

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

        {layout === 'split' && (
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div className="md:sticky md:top-24 md:self-start">
              {s.heading && <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${tok.heading}`}>{s.heading}</h2>}
              {s.subtext && <p className={`mt-4 text-lg leading-relaxed ${tok.body}`}>{s.subtext}</p>}
            </div>
            <div className={`divide-y ${tok.border}`}>
              {items.map((f, i) => (
                <div key={i} className="flex gap-4 py-5 first:pt-0">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ background: `${accent}1a`, color: accent }}>
                    <i className={`bx ${f.icon || 'bx-check'}`} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className={`text-base font-semibold ${tok.heading}`}>{f.title}</h3>
                    {f.body && <p className={`mt-1 text-[15px] leading-relaxed ${tok.body}`}>{f.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ──────────────────────────── STATS ───────────────────────────── */
export function StatsBlock({ s, accent }: { s: StatsSection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  const items = (s.items || []).filter((i) => i && (i.value || i.label));
  if (items.length === 0) return null;
  return (
    <section className={tok.section} style={tok.style}>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        {s.heading && <h2 className={`mb-10 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl ${tok.heading}`}>{s.heading}</h2>}
        <div className={`grid grid-cols-2 gap-8 sm:gap-10 ${items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {items.map((it, i) => (
            <div key={i}>
              <p className="text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: accent }}>{it.value}</p>
              <p className={`mt-2 text-sm font-medium ${tok.body}`}>{it.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── PRODUCTS ─────────────────────────── */
export function ProductsBlock({ s, accent, site }: { s: ProductsSection; accent: string; site: SiteContext }) {
  const tok = surfaceTokens(s.bg, accent);
  const variant = s.variant || 'grid';
  const products = (site.products || []).slice(0, s.limit || 6);
  const shopHref = site.storefrontUrl || undefined;
  const placeholder = products.length === 0;
  const money = (n: number) => formatMoney(n, site.currency || 'NGN');
  const skeletonBg = tok.isDark ? 'bg-white/10' : 'bg-gray-100';

  const ViewAll = !placeholder && shopHref && (
    <div className="mt-8 text-center">
      <a href={shopHref} className="inline-flex h-10 items-center rounded-lg px-5 text-sm font-semibold text-white" style={{ background: accent }}>View all products</a>
    </div>
  );

  /* list — image thumb + name + price rows (services / lookbook feel) */
  if (variant === 'list') {
    const rows = placeholder ? Array.from({ length: Math.min(s.limit || 4, 5) }, (_, i) => i) : products;
    return (
      <section className={tok.section} style={tok.style}>
        <div className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
          {s.heading && <h2 className={`mb-8 text-3xl font-bold tracking-tight ${tok.heading}`}>{s.heading}</h2>}
          <div className={`divide-y ${tok.border}`}>
            {placeholder
              ? (rows as number[]).map((i) => (
                  <div key={i} className="flex items-center gap-4 py-4">
                    <div className={`h-16 w-16 shrink-0 rounded-xl ${skeletonBg}`} />
                    <div className="flex-1"><div className={`h-3 w-1/2 rounded ${skeletonBg}`} /><div className={`mt-2 h-3 w-1/4 rounded ${skeletonBg}`} /></div>
                  </div>
                ))
              : (rows as StoreProduct[]).map((p) => (
                  <a key={p.id} href={shopHref} className="flex items-center gap-4 py-4 transition hover:opacity-80">
                    <div className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl ${tok.isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      {p.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex flex-1 items-baseline justify-between gap-3">
                      <span className={`font-medium ${tok.heading}`}>{p.name}</span>
                      <span className="shrink-0 font-semibold" style={{ color: accent }}>{money(p.price)}</span>
                    </div>
                  </a>
                ))}
          </div>
          {ViewAll}
        </div>
      </section>
    );
  }

  /* showcase — one big lead product + a smaller grid */
  if (variant === 'showcase' && !placeholder && products.length >= 3) {
    const [lead, ...rest] = products;
    return (
      <section className={tok.section} style={tok.style}>
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          {s.heading && <h2 className={`mb-8 text-3xl font-bold tracking-tight ${tok.heading}`}>{s.heading}</h2>}
          <div className="grid gap-4 lg:grid-cols-2">
            <a href={shopHref} className={`group relative overflow-hidden rounded-3xl ring-1 ${tok.cardRing}`}>
              <div className={`aspect-[4/5] overflow-hidden lg:aspect-auto lg:h-full ${tok.isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                {lead.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={lead.imageUrl} alt={lead.name} className="h-full w-full object-cover transition group-hover:scale-105" />}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <p className="text-lg font-semibold text-white">{lead.name}</p>
                <p className="mt-0.5 font-semibold text-white/90">{money(lead.price)}</p>
              </div>
            </a>
            <div className="grid grid-cols-2 gap-4">
              {rest.slice(0, 4).map((p) => (
                <a key={p.id} href={shopHref} className={`group overflow-hidden rounded-2xl ring-1 transition hover:-translate-y-0.5 ${tok.card} ${tok.cardRing}`}>
                  <div className={`aspect-square overflow-hidden ${tok.isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    {p.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />}
                  </div>
                  <div className="p-3">
                    <p className={`truncate text-sm font-medium ${tok.heading}`}>{p.name}</p>
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: accent }}>{money(p.price)}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
          {ViewAll}
        </div>
      </section>
    );
  }

  /* grid (default) */
  const cells = placeholder ? Array.from({ length: Math.min(s.limit || 6, 8) }, (_, i) => i) : products;
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
                    <p className="mt-0.5 text-sm font-semibold" style={{ color: accent }}>{money(p.price)}</p>
                  </div>
                </a>
              ))}
        </div>
        {placeholder && <p className={`mt-4 text-center text-xs ${tok.muted}`}>Live products from your store appear here once it has stock.</p>}
        {ViewAll}
      </div>
    </section>
  );
}

/* ──────────────────────────── MENU ────────────────────────────── */
export function MenuBlock({ s, accent }: { s: MenuSection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  const groups = (s.groups || []).filter((g) => g && (g.items || []).length > 0);
  if (groups.length === 0) return null;
  return (
    <section className={tok.section} style={tok.style}>
      <div className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
        {s.heading && <h2 className={`mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl ${tok.heading}`}>{s.heading}</h2>}
        <div className="grid gap-x-14 gap-y-10 sm:grid-cols-2">
          {groups.map((g, gi) => (
            <div key={gi}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>{g.title}</h3>
              <div className="space-y-4">
                {g.items.map((it, i) => (
                  <div key={i}>
                    <div className="flex items-baseline gap-3">
                      <span className={`font-medium ${tok.heading}`}>{it.name}</span>
                      <span className={`flex-1 border-b border-dotted ${tok.border}`} />
                      <span className="shrink-0 font-semibold tabular-nums" style={{ color: accent }}>{it.price}</span>
                    </div>
                    {it.description && <p className={`mt-1 text-sm leading-relaxed ${tok.muted}`}>{it.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── GALLERY ──────────────────────────── */
export function GalleryBlock({ s, accent }: { s: GallerySection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  const variant = s.variant || 'grid';
  const imgs = (s.images || []).filter(Boolean);
  const Heading = s.heading && <h2 className={`mb-8 text-3xl font-bold tracking-tight ${tok.heading}`}>{s.heading}</h2>;

  if (imgs.length === 0) {
    return (
      <section className={tok.section} style={tok.style}>
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          {Heading}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className={`aspect-square w-full rounded-2xl ${tok.isDark ? 'bg-white/5' : 'bg-gray-100'}`} />)}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'strip') {
    return (
      <section className={tok.section} style={tok.style}>
        <div className="py-16 sm:py-20">
          {s.heading && <div className="mx-auto mb-8 max-w-6xl px-5">{Heading}</div>}
          <div className="flex snap-x gap-4 overflow-x-auto px-5 pb-2">
            {imgs.map((src, i) => (
              <div key={i} className="relative aspect-[3/4] w-72 shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'masonry') {
    return (
      <section className={tok.section} style={tok.style}>
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          {Heading}
          <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
            {imgs.map((src, i) => (
              <div key={i} className="overflow-hidden rounded-2xl ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className={`w-full object-cover ${i % 3 === 0 ? 'aspect-[3/4]' : i % 3 === 1 ? 'aspect-square' : 'aspect-[4/5]'}`} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'wide') {
    return (
      <section className={tok.section} style={tok.style}>
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          {Heading}
          <div className="grid gap-4 sm:grid-cols-2">
            {imgs.map((src, i) => (
              <div key={i} className="overflow-hidden rounded-2xl ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-[16/10] w-full object-cover transition duration-500 hover:scale-105" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* grid (default) */
  return (
    <section className={tok.section} style={tok.style}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        {Heading}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {imgs.map((src, i) => (
            <div key={i} className="group overflow-hidden rounded-2xl ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── TESTIMONIAL ──────────────────────── */
export function TestimonialBlock({ s, accent }: { s: TestimonialSection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  if (!s.quote) return null;
  return (
    <section className={tok.section} style={tok.style}>
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
        <i className="bx bxs-quote-alt-left text-5xl" style={{ color: accent }} aria-hidden="true" />
        <blockquote className={`mt-4 text-2xl font-medium leading-snug tracking-tight sm:text-3xl ${tok.heading}`}>{s.quote}</blockquote>
        {(s.author || s.role) && (
          <p className={`mt-8 text-sm font-semibold ${tok.body}`}>
            {s.author}{s.author && s.role ? ' · ' : ''}<span className={tok.muted}>{s.role}</span>
          </p>
        )}
      </div>
    </section>
  );
}

/* ──────────────────────────── CTA ─────────────────────────────── */
export function CtaBlock({ s, accent }: { s: CtaSection; accent: string }) {
  const tok = surfaceTokens(s.bg, accent);
  const variant = s.variant || 'card';
  const Button = s.buttonHref && s.buttonLabel && (
    <a href={s.buttonHref} className="inline-flex h-12 shrink-0 items-center rounded-xl bg-white px-7 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5" style={{ color: accent }}>
      {s.buttonLabel}
    </a>
  );

  if (variant === 'banner') {
    return (
      <section style={{ background: `linear-gradient(120deg, ${accent}, ${accent}cc)` }}>
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-14 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            {s.heading && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.heading}</h2>}
            {s.subtext && <p className="mt-2 max-w-xl text-white/90">{s.subtext}</p>}
          </div>
          {Button}
        </div>
      </section>
    );
  }

  if (variant === 'split') {
    return (
      <section className={tok.section} style={tok.style}>
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className={`flex flex-col items-start gap-6 rounded-3xl p-8 ring-1 sm:flex-row sm:items-center sm:justify-between sm:p-12 ${tok.card} ${tok.cardRing}`}>
            <div>
              {s.heading && <h2 className={`text-2xl font-bold tracking-tight sm:text-3xl ${tok.heading}`}>{s.heading}</h2>}
              {s.subtext && <p className={`mt-2 max-w-xl ${tok.body}`}>{s.subtext}</p>}
            </div>
            {s.buttonHref && s.buttonLabel && (
              <a href={s.buttonHref} className="inline-flex h-12 shrink-0 items-center rounded-xl px-7 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5" style={{ background: accent }}>{s.buttonLabel}</a>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* card (default) */
  return (
    <section className={tok.section} style={tok.style}>
      <div className="px-5 py-16 sm:py-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] px-8 py-16 text-center text-white shadow-2xl" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative">
            {s.heading && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{s.heading}</h2>}
            {s.subtext && <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">{s.subtext}</p>}
            {s.buttonHref && s.buttonLabel && (
              <a href={s.buttonHref} className="mt-8 inline-flex h-12 items-center rounded-xl bg-white px-7 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5" style={{ color: accent }}>{s.buttonLabel}</a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── CONTACT ──────────────────────────── */
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

/** Render any block by type. */
export function SiteBlock({ section, accent, site }: { section: WebsiteSection; accent: string; site: SiteContext }) {
  switch (section.type) {
    case 'hero':
      return <HeroBlock s={section} accent={accent} site={site} />;
    case 'text':
      return <TextBlock s={section} accent={accent} />;
    case 'features':
      return <FeaturesBlock s={section} accent={accent} />;
    case 'stats':
      return <StatsBlock s={section} accent={accent} />;
    case 'products':
      return <ProductsBlock s={section} accent={accent} site={site} />;
    case 'menu':
      return <MenuBlock s={section} accent={accent} />;
    case 'gallery':
      return <GalleryBlock s={section} accent={accent} />;
    case 'testimonial':
      return <TestimonialBlock s={section} accent={accent} />;
    case 'cta':
      return <CtaBlock s={section} accent={accent} />;
    case 'contact':
      return <ContactBlock s={section} accent={accent} site={site} />;
    default:
      return null;
  }
}
