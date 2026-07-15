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

/** Server-side fetch used by getServerSideProps on /m/[slug]. */
export async function fetchPublicMenu(
  slug: string,
): Promise<PublicMenuData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
  try {
    const res = await fetch(
      `${apiUrl.replace(/\/$/, '')}/api/public/menu/${encodeURIComponent(slug)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success || !json?.data?.venue) return null;
    return json.data as PublicMenuData;
  } catch {
    return null;
  }
}
