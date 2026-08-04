import type {
  WebsiteSection,
  HeroSection,
  TextSection,
  GallerySection,
  CtaSection,
  ContactSection,
} from '@/lib/website-sections';

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
}

export function HeroBlock({ s, accent, site }: { s: HeroSection; accent: string; site: SiteContext }) {
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
      <div className={`relative mx-auto max-w-5xl px-5 ${hasImg ? 'py-24 text-white' : 'py-20'}`}>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">{s.headline || site.businessName}</h1>
        {s.subtext && <p className={`mt-4 max-w-xl text-lg ${hasImg ? 'text-white/85' : 'text-gray-600'}`}>{s.subtext}</p>}
        {s.ctaHref && s.ctaLabel && (
          <a href={s.ctaHref} className="mt-8 inline-flex h-11 items-center rounded-lg px-6 text-sm font-semibold text-white shadow-sm" style={{ background: accent }}>
            {s.ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

export function TextBlock({ s }: { s: TextSection }) {
  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
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

export function GalleryBlock({ s }: { s: GallerySection }) {
  const imgs = (s.images || []).filter(Boolean);
  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      {s.heading && <h2 className="mb-6 text-2xl font-bold tracking-tight">{s.heading}</h2>}
      {imgs.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square w-full rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {imgs.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      )}
    </section>
  );
}

export function CtaBlock({ s, accent }: { s: CtaSection; accent: string }) {
  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-3xl rounded-3xl px-8 py-12 text-center text-white" style={{ background: accent }}>
        {s.heading && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.heading}</h2>}
        {s.subtext && <p className="mx-auto mt-3 max-w-xl text-white/85">{s.subtext}</p>}
        {s.buttonHref && s.buttonLabel && (
          <a href={s.buttonHref} className="mt-6 inline-flex h-11 items-center rounded-lg bg-white px-6 text-sm font-semibold shadow-sm" style={{ color: accent }}>
            {s.buttonLabel}
          </a>
        )}
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

/** Render any block by type. */
export function SiteBlock({ section, accent, site }: { section: WebsiteSection; accent: string; site: SiteContext }) {
  switch (section.type) {
    case 'hero':
      return <HeroBlock s={section} accent={accent} site={site} />;
    case 'text':
      return <TextBlock s={section} />;
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
