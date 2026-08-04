/**
 * Server-side fetch for the public website renderer (pages/site/[slug].tsx).
 * Mirrors lib/menu-public.ts: tries the configured SSR base, then a
 * host.docker.internal fallback so SSR works whether the backend is on the host
 * or in a sibling container. Relative /uploads/... images are absolutized to the
 * API origin so they load from the public page.
 */

import type { WebsiteSection } from './website-sections';
import type { StoreProduct } from '@/components/website/SiteBlocks';

export interface PublicSiteInfo {
  businessName: string;
  tagline: string | null;
  about: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  heroHeadline: string | null;
  heroSubtext: string | null;
  accentColor: string | null;
  templateKey: string;
  whatsapp: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  storefrontUrl: string | null;
  currency: string;
  slug: string;
  sections: WebsiteSection[] | null;
}

const PUBLIC_API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

function absImage(src?: string | null): string | null {
  if (!src) return null;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return `${PUBLIC_API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`;
}

/** Absolutize image URLs inside the ordered sections (hero/text/gallery). */
function absolutizeSections(sections: unknown): WebsiteSection[] | null {
  if (!Array.isArray(sections)) return null;
  return sections.map((s: any) => {
    if (s && (s.type === 'hero' || s.type === 'text') && s.imageUrl) {
      return { ...s, imageUrl: absImage(s.imageUrl) };
    }
    if (s && s.type === 'gallery' && Array.isArray(s.images)) {
      return { ...s, images: s.images.map((i: string) => absImage(i)).filter(Boolean) };
    }
    return s;
  }) as WebsiteSection[];
}

function ssrBases(): string[] {
  const configured =
    process.env.SSR_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
  const bases = [configured];
  if (/localhost|127\.0\.0\.1/.test(configured)) {
    bases.push(configured.replace(/localhost|127\.0\.0\.1/, 'host.docker.internal'));
  }
  return bases;
}

/** Live products from the tenant's Storefront, for the `products` block. */
export async function fetchStoreProducts(storeSlug: string): Promise<StoreProduct[]> {
  for (const base of ssrBases()) {
    try {
      const res = await fetch(
        `${base.replace(/\/$/, '')}/api/public/store/${encodeURIComponent(storeSlug)}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) continue;
      const json = await res.json();
      const products = json?.data?.products;
      if (json?.success && Array.isArray(products)) {
        return products.map((p: any) => ({
          id: String(p.id),
          name: String(p.name),
          price: Number(p.price || 0),
          imageUrl: absImage(p.imageUrl),
        }));
      }
    } catch {
      // try the next candidate
    }
  }
  return [];
}

export async function fetchPublicSite(slug: string): Promise<PublicSiteInfo | null> {
  const configured =
    process.env.SSR_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
  const candidates = [configured];
  if (/localhost|127\.0\.0\.1/.test(configured)) {
    candidates.push(configured.replace(/localhost|127\.0\.0\.1/, 'host.docker.internal'));
  }

  for (const base of candidates) {
    try {
      const res = await fetch(
        `${base.replace(/\/$/, '')}/api/public/site/${encodeURIComponent(slug)}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) continue;
      const json = await res.json();
      const site = json?.data?.site;
      if (json?.success && site?.businessName) {
        return {
          ...site,
          logoUrl: absImage(site.logoUrl),
          heroImageUrl: absImage(site.heroImageUrl),
          sections: absolutizeSections(site.sections),
        } as PublicSiteInfo;
      }
    } catch {
      // try the next candidate (e.g. host.docker.internal from inside Docker)
    }
  }
  return null;
}
