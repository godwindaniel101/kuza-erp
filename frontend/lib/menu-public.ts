/**
 * Kuza Menu — shared types + helpers for the public menu page (/m/[slug])
 * and the Menu Studio builder. Kept dependency-free and tree-shakeable so
 * the guest-facing page stays light.
 */

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl?: string | null;
  /** Subcategory name for two-level menus; null when the item has none. */
  subcategory?: string | null;
  isAvailable: boolean;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  description?: string | null;
  items: PublicMenuItem[];
}

export interface PublicMenu {
  id: string;
  name: string;
  categories: PublicMenuCategory[];
}

export interface PublicVenue {
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
  feedbackUrl: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  currency: string;
  showPrices: boolean;
  templateKey: string;
  themeKey: string;
  accentColor: string | null;
  slug: string;
}

export interface PublicMenuData {
  venue: PublicVenue;
  menus: PublicMenu[];
}

export interface MenuSiteRecord {
  id: string;
  slug: string;
  isPublished: boolean;
  templateKey: string;
  themeKey: string;
  accentColor: string | null;
  venueName: string;
  tagline: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
  feedbackUrl: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  currency: string;
  showPrices: boolean;
  menuIds: string[] | null;
  publicUrl: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KES: 'KSh ',
  GHS: 'GH₵',
  ZAR: 'R',
  XOF: 'CFA ',
  XAF: 'FCFA ',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  AED: 'AED ',
};

/**
 * Format a price for menu display. Whole amounts drop the decimals
 * (₦4,500 not ₦4,500.00) — menus read better that way.
 */
export function formatMenuPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
  return `${symbol}${formatted}`;
}

/**
 * Server-side fetch used by getServerSideProps on /m/[slug].
 *
 * Tries the configured API base first; if that's a localhost URL (which, when
 * the frontend runs inside Docker, points at the *container* — not the host
 * backend), it also tries `host.docker.internal`. This makes the public menu
 * render whether the backend is on the host, in a sibling container, or bare
 * metal. `SSR_API_URL` can pin an explicit server-side base if set.
 */
export async function fetchPublicMenu(
  slug: string,
): Promise<PublicMenuData | null> {
  const configured =
    process.env.SSR_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
  const candidates = [configured];
  if (/localhost|127\.0\.0\.1/.test(configured)) {
    candidates.push(configured.replace(/localhost|127\.0\.0\.1/, 'host.docker.internal'));
  }

  for (const base of candidates) {
    try {
      const res = await fetch(
        `${base.replace(/\/$/, '')}/api/public/menu/${encodeURIComponent(slug)}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) continue;
      const json = await res.json();
      if (json?.success && json?.data?.venue) {
        return resolvePublicImages(json.data as PublicMenuData);
      }
    } catch {
      // try the next candidate (e.g. host.docker.internal from inside Docker)
    }
  }
  return null;
}

// Backend stores dish/logo images as relative "/uploads/..." paths served by
// the API origin — resolve them to a browser-reachable absolute URL so they
// load on the guest page (which is served from the frontend origin).
const PUBLIC_API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

function absImage(src?: string | null): string | null {
  if (!src) return null;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return `${PUBLIC_API_ORIGIN}${src.startsWith('/') ? '' : '/'}${src}`;
}

function resolvePublicImages(data: PublicMenuData): PublicMenuData {
  return {
    ...data,
    venue: { ...data.venue, logoUrl: absImage(data.venue.logoUrl) },
    menus: data.menus.map((menu) => ({
      ...menu,
      categories: menu.categories.map((cat) => ({
        ...cat,
        items: cat.items.map((it) => ({ ...it, imageUrl: absImage(it.imageUrl) })),
      })),
    })),
  };
}
