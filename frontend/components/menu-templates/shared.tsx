import { useEffect, useRef, useState } from 'react';
import {
  formatMenuPrice,
  PublicMenuData,
  PublicMenuItem,
  PublicVenue,
} from '@/lib/menu-public';
import { MenuTheme } from './types';
import { ReservationSheet } from './ReservationSheet';

/**
 * Shared building blocks used by every archetype: sticky category nav,
 * contact buttons, WiFi card and the "Powered by Kuza" footer.
 * All colors come from theme tokens via inline styles; all icons are tiny
 * inline SVGs (no icon font on the guest page).
 */

export function accentOf(data: PublicMenuData, theme: MenuTheme): string {
  return data.venue.accentColor || theme.accent;
}

export function sectionId(categoryId: string): string {
  return `cat-${categoryId}`;
}

export interface SubGroup {
  name: string | null;
  items: PublicMenuItem[];
}

/**
 * Group a category's items by subcategory, preserving first-seen order. Items
 * without a subcategory collapse into a single leading `name: null` group.
 * Returns a single null group when nothing has a subcategory (so templates can
 * cheaply detect "no subcategories" via `groups.length === 1 && !groups[0].name`).
 */
export function subGroups(items: PublicMenuItem[]): SubGroup[] {
  const order: (string | null)[] = [];
  const byName = new Map<string | null, PublicMenuItem[]>();
  for (const item of items) {
    const key = item.subcategory || null;
    if (!byName.has(key)) {
      byName.set(key, []);
      order.push(key);
    }
    byName.get(key)!.push(item);
  }
  return order.map((name) => ({ name, items: byName.get(name)! }));
}

/** True when a category actually has named subcategories worth showing. */
export function hasSubcategories(items: PublicMenuItem[]): boolean {
  return items.some((i) => i.subcategory);
}

export interface NavSection {
  id: string;
  label: string;
}

export function navSections(data: PublicMenuData): NavSection[] {
  const sections: NavSection[] = [];
  for (const menu of data.menus) {
    for (const category of menu.categories) {
      sections.push({ id: sectionId(category.id), label: category.name });
    }
  }
  return sections;
}

/**
 * Sticky horizontal category nav. Pure anchor links — with JS disabled the
 * jumps still work; `scroll-behavior: smooth` (set on the template root via
 * CSS) makes them glide when JS/CSS allows.
 */
export function CategoryNav({
  sections,
  theme,
  accent,
}: {
  sections: NavSection[];
  theme: MenuTheme;
  accent: string;
}) {
  if (sections.length < 2) return null;
  return (
    <nav
      className="sticky top-0 z-20 -mx-4 px-4 py-2 overflow-x-auto whitespace-nowrap backdrop-blur"
      style={{
        backgroundColor: `${theme.bg}E6`,
        borderBottom: `1px solid ${theme.border}`,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
      aria-label="Menu sections"
    >
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="inline-block text-sm font-medium mr-2 px-3 py-1.5 transition-colors"
          style={{
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: '999px',
            backgroundColor: theme.surface,
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
            style={{ backgroundColor: accent }}
          />
          {s.label}
        </a>
      ))}
    </nav>
  );
}

function PhoneIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function WhatsAppIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function InstagramIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function WifiIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function instagramUrl(handle: string): string {
  const clean = handle.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
  return `https://instagram.com/${clean}`;
}

function whatsappUrl(number: string): string {
  return `https://wa.me/${number.replace(/[^\d]/g, '')}`;
}

/** Call / WhatsApp / Instagram pill buttons — rendered only when set. */
export function ContactBar({
  venue,
  theme,
  accent,
}: {
  venue: PublicVenue;
  theme: MenuTheme;
  accent: string;
}) {
  const buttons: { label: string; href: string; icon: JSX.Element }[] = [];
  if (venue.phone) {
    buttons.push({
      label: 'Call',
      href: `tel:${venue.phone.replace(/\s+/g, '')}`,
      icon: <PhoneIcon color={accent} />,
    });
  }
  if (venue.whatsapp) {
    buttons.push({
      label: 'WhatsApp',
      href: whatsappUrl(venue.whatsapp),
      icon: <WhatsAppIcon color={accent} />,
    });
  }
  if (venue.instagram) {
    buttons.push({
      label: 'Instagram',
      href: instagramUrl(venue.instagram),
      icon: <InstagramIcon color={accent} />,
    });
  }
  if (buttons.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-5">
      {buttons.map((b) => (
        <a
          key={b.label}
          href={b.href}
          target={b.href.startsWith('tel:') ? undefined : '_blank'}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2"
          style={{
            color: theme.text,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '999px',
          }}
        >
          {b.icon}
          {b.label}
        </a>
      ))}
    </div>
  );
}

/** WiFi credentials card — rendered only when a network name is set. */
export function WifiCard({
  venue,
  theme,
  accent,
}: {
  venue: PublicVenue;
  theme: MenuTheme;
  accent: string;
}) {
  if (!venue.wifiName) return null;
  return (
    <div
      className="mt-10 mx-auto max-w-sm px-5 py-4 text-center"
      style={{
        backgroundColor: theme.surface,
        border: `1px dashed ${accent}`,
        borderRadius: theme.radius,
      }}
    >
      <div
        className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest"
        style={{ color: theme.muted }}
      >
        <WifiIcon color={accent} />
        Guest WiFi
      </div>
      <div className="mt-1.5 font-semibold" style={{ color: theme.text }}>
        {venue.wifiName}
      </div>
      {venue.wifiPassword && (
        <div className="mt-0.5 text-sm" style={{ color: theme.muted }}>
          Password:{' '}
          <span
            className="font-mono font-semibold select-all"
            style={{ color: theme.text }}
          >
            {venue.wifiPassword}
          </span>
        </div>
      )}
    </div>
  );
}

/** The growth loop — always present in v1. */
export function KuzaFooter({ theme }: { theme: MenuTheme }) {
  return (
    <footer className="mt-12 pb-10 text-center">
      <a
        href="https://kuza.africa?utm_source=menu&utm_medium=footer"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs tracking-wide"
        style={{ color: theme.muted }}
      >
        Powered by{' '}
        <span className="font-bold" style={{ color: theme.text }}>
          Kuza
        </span>
      </a>
    </footer>
  );
}

/** Small "Sold out" tag for unavailable items. */
export function SoldOut({ theme }: { theme: MenuTheme }) {
  return (
    <span
      className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
      style={{
        color: theme.muted,
        border: `1px solid ${theme.border}`,
        borderRadius: '4px',
      }}
    >
      Sold out
    </span>
  );
}

/** Shared smooth-scroll target: premium covers link to this id to reveal the menu. */
export const MENU_START_ID = 'menu-start';

/**
 * Dish image that renders a theme-colored `fallback` (e.g. the item's initial
 * letter) when there's no URL or the image fails to load — so the empty state
 * follows the palette instead of showing a static default image.
 */
export function DishImage({
  src,
  className = '',
  style,
  fallback,
}: {
  src?: string | null;
  className?: string;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false); // retry when the src changes
  }, [src]);
  if (!src || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
      style={style}
    />
  );
}

/**
 * Decorative "seigaiha" wave field (Japanese fish-scale). Rendered as a tiled
 * SVG pattern; kept low-contrast so text stays readable. Purely ornamental.
 */
export function Seigaiha({
  color,
  opacity = 0.5,
  className = '',
}: {
  color: string;
  opacity?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="100%"
      height="100%"
      style={{ opacity }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="seigaiha" width="60" height="30" patternUnits="userSpaceOnUse">
          {[26, 18, 10].map((r, i) => (
            <g key={i} fill="none" stroke={color} strokeWidth="1.4">
              <path d={`M-30 30 A${r} ${r} 0 0 1 ${-30 + 2 * r} 30`} transform="translate(0,0)" />
              <circle cx="0" cy="30" r={r} />
              <circle cx="60" cy="30" r={r} />
              <circle cx="30" cy="0" r={r} />
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#seigaiha)" />
    </svg>
  );
}

/** Scattered coffee-bean watermark field. Ornamental, low-contrast. */
export function CoffeeBeanField({
  color,
  opacity = 0.08,
  className = '',
}: {
  color: string;
  opacity?: number;
  className?: string;
}) {
  return (
    <svg aria-hidden="true" className={className} width="100%" height="100%" style={{ opacity }}>
      <defs>
        <g id="bean">
          <ellipse cx="0" cy="0" rx="9" ry="6" fill="none" stroke={color} strokeWidth="1.5" />
          <path d="M-6 -3 Q0 0 6 3" fill="none" stroke={color} strokeWidth="1.5" />
        </g>
        <pattern id="beans" width="90" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <use href="#bean" x="20" y="22" />
          <use href="#bean" x="66" y="60" transform="rotate(35 66 60)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#beans)" />
    </svg>
  );
}

/** A hand-drawn leaf branch used as a corner ornament for the Botanical cover. */
export function LeafBranch({ color, className = '' }: { color: string; className?: string }) {
  const leaf = (x: number, y: number, rot: number) => (
    <path
      d="M0 0 C10 -8 24 -8 30 0 C24 8 10 8 0 0 Z"
      fill={color}
      opacity="0.85"
      transform={`translate(${x} ${y}) rotate(${rot}) scale(0.8)`}
    />
  );
  return (
    <svg width="130" height="120" viewBox="0 0 130 120" fill="none" className={className} aria-hidden="true">
      <path d="M120 6 C90 24 66 50 52 92" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {leaf(112, 20, -35)}
      {leaf(96, 38, -25)}
      {leaf(80, 56, -18)}
      {leaf(66, 74, -8)}
      {leaf(104, 30, 150)}
      {leaf(88, 48, 158)}
    </svg>
  );
}

/**
 * A full-height intro "cover" screen shared by the premium archetypes. It is a
 * normal in-flow section (not a blocking overlay), so the menu below stays in
 * the SSR DOM; the CTA smooth-scrolls down to reveal it.
 */
export function IntroCover({
  venue,
  theme,
  accent,
  background,
  ctaLabel = 'View Menu',
  onEnter,
  children,
}: {
  venue: PublicVenue;
  theme: MenuTheme;
  accent: string;
  background?: React.ReactNode;
  ctaLabel?: string;
  /** When set, the CTA switches paged view instead of anchor-scrolling. */
  onEnter?: () => void;
  children?: React.ReactNode;
}) {
  const [reserveOpen, setReserveOpen] = useState(false);
  const mapsHref = venue.address
    ? `https://maps.google.com/?q=${encodeURIComponent(venue.address)}`
    : null;
  const ctaStyle = {
    backgroundColor: accent,
    color: theme.bg,
    borderRadius: theme.radius,
  } as const;
  const ctaClass =
    'mt-10 inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold uppercase tracking-wider transition-transform active:scale-95';
  return (
    <section
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ backgroundColor: theme.bg }}
    >
      {background}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center py-16">
        {venue.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={venue.logoUrl}
            alt={venue.name}
            className="mb-7 h-32 w-32 object-contain"
            style={{ filter: `drop-shadow(0 0 24px ${accent}66)` }}
          />
        )}
        {children}
        <ContactBar venue={venue} theme={theme} accent={accent} />
        {venue.address && (
          <p className="mt-6 max-w-xs text-sm" style={{ color: theme.muted }}>
            {venue.address}
          </p>
        )}
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-xs font-semibold uppercase tracking-widest"
            style={{ color: accent }}
          >
            Get directions →
          </a>
        )}
        {onEnter ? (
          <button type="button" onClick={onEnter} className={ctaClass} style={ctaStyle}>
            {ctaLabel}
            <span aria-hidden="true">→</span>
          </button>
        ) : (
          <a href={`#${MENU_START_ID}`} className={ctaClass} style={ctaStyle}>
            {ctaLabel}
            <span aria-hidden="true">↓</span>
          </a>
        )}
        <button
          type="button"
          onClick={() => setReserveOpen(true)}
          className="mt-4 text-xs font-semibold uppercase tracking-widest underline-offset-4 transition-opacity hover:opacity-80"
          style={{ color: accent }}
        >
          Reserve a table
        </button>
      </div>
      <ReservationSheet
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        venue={venue}
        theme={theme}
        accent={accent}
      />
    </section>
  );
}

/**
 * Paged navigation for the app-style archetypes. Screens: the cover, the
 * "home" (category index), and a single category page. Switching screens
 * scrolls the active scroll container back to the top (works inside the
 * preview device frame and on the real guest page alike).
 */
export type MenuScreen =
  | { name: 'cover' }
  | { name: 'home' }
  | { name: 'category'; categoryId: string };

export function useMenuPager(initial: MenuScreen = { name: 'cover' }) {
  const [screen, setScreenState] = useState<MenuScreen>(initial);
  const topRef = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    // Reset scroll to the top of the freshly-shown screen.
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [screen]);

  return { screen, setScreen: setScreenState, topRef };
}

/** Sticky back bar for a category page. */
export function BackBar({
  title,
  theme,
  accent,
  onBack,
}: {
  title: string;
  theme: MenuTheme;
  accent: string;
  onBack: () => void;
}) {
  return (
    <div
      className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3"
      style={{ backgroundColor: `${theme.bg}F2`, backdropFilter: 'blur(6px)', borderBottom: `1px solid ${theme.border}` }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none transition-transform active:scale-90"
        style={{ border: `1px solid ${theme.border}`, color: accent }}
      >
        ‹
      </button>
      <span className="truncate text-sm font-bold uppercase tracking-wide" style={{ color: theme.text }}>
        {title}
      </span>
    </div>
  );
}

/**
 * Hand-drawn food-doodle field (burgers, fries, pizza, hearts) — the signature
 * Escape background. Tiled low-contrast line art; purely ornamental.
 */
export function DoodleField({
  color,
  opacity = 0.12,
  className = '',
}: {
  color: string;
  opacity?: number;
  className?: string;
}) {
  const s = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg aria-hidden="true" className={className} width="100%" height="100%" style={{ opacity }}>
      <defs>
        <pattern id="doodles" width="200" height="200" patternUnits="userSpaceOnUse">
          {/* heart */}
          <path {...s} d="M30 42c-8-6-14-11-14-18a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 7-6 12-14 18Z" />
          {/* fries */}
          <g {...s}>
            <path d="M150 30l6 34h20l6-34" />
            <path d="M150 40h32" />
            <path d="M158 30v-12M166 30v-16M174 30v-12" />
          </g>
          {/* burger */}
          <g {...s}>
            <path d="M60 150c0-8 9-14 20-14s20 6 20 14" />
            <path d="M58 156h44" />
            <path d="M60 164c2 6 8 8 20 8s18-2 20-8" />
            <path d="M58 150h44" />
          </g>
          {/* pizza slice */}
          <g {...s}>
            <path d="M150 150l18 40 18-40Z" />
            <circle cx="164" cy="166" r="2.4" />
            <circle cx="172" cy="176" r="2.4" />
          </g>
          {/* I heart */}
          <g {...s}>
            <path d="M96 96v18M90 96h12M90 114h12" />
            <path d="M116 100c-4-3-7 0-7 3 0 4 4 6 7 9 3-3 7-5 7-9 0-3-3-6-7-3Z" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#doodles)" />
    </svg>
  );
}

/**
 * Brief full-screen preloader that fades out shortly after mount. Purely a
 * flourish for the app-style archetypes; unmounts itself so it never blocks.
 */
export function Preloader({
  theme,
  accent,
  venue,
}: {
  theme: MenuTheme;
  accent: string;
  venue: PublicVenue;
}) {
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 850);
    const t2 = setTimeout(() => setGone(true), 1250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  if (gone) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-300"
      style={{ backgroundColor: theme.bg, opacity: fading ? 0 : 1 }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-5">
        {venue.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={venue.logoUrl} alt="" className="h-24 w-24 object-contain" style={{ filter: `drop-shadow(0 0 20px ${accent}66)` }} />
        ) : (
          <div
            className="menu-spin h-12 w-12 rounded-full"
            style={{ border: `3px solid ${accent}33`, borderTopColor: accent }}
          />
        )}
        <div className="text-sm font-black uppercase tracking-[0.35em]" style={{ color: accent }}>
          {venue.name}
        </div>
        <div className="flex gap-1.5">
          {[0, 0.15, 0.3].map((d) => (
            <span
              key={d}
              className="menu-preload-dot h-2 w-2 rounded-full"
              style={{ backgroundColor: accent, animationDelay: `${d}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Three-line hamburger button. */
export function Hamburger({ color, onClick, className = '' }: { color: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open menu"
      className={`flex h-10 w-10 flex-col items-center justify-center gap-[5px] ${className}`}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-[2.5px] w-6 rounded-full" style={{ backgroundColor: color }} />
      ))}
    </button>
  );
}

function DrawerContact({
  venue,
  theme,
  accent,
  children,
}: {
  venue: PublicVenue;
  theme: MenuTheme;
  accent: string;
  children?: React.ReactNode;
}) {
  const rows: JSX.Element[] = [];
  if (venue.address) {
    rows.push(
      <a
        key="addr"
        href={`https://maps.google.com/?q=${encodeURIComponent(venue.address)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 text-sm"
        style={{ color: theme.text }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#E14747" aria-hidden="true">
          <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
        </svg>
        {venue.address}
      </a>,
    );
  }
  if (venue.phone) {
    rows.push(
      <a key="tel" href={`tel:${venue.phone.replace(/\s+/g, '')}`} className="flex items-center gap-3 text-sm" style={{ color: theme.text }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#2FBF71" aria-hidden="true">
          <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1Z" />
        </svg>
        {venue.phone}
      </a>,
    );
  }
  if (venue.instagram) {
    const handle = venue.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
    rows.push(
      <a key="ig" href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm" style={{ color: theme.text }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
        @{handle}
      </a>,
    );
  }
  if (venue.facebook) {
    const fb = venue.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/^@/, '');
    rows.push(
      <a key="fb" href={`https://facebook.com/${fb}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm" style={{ color: theme.text }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
          <path d="M13.5 21v-7h2.3l.4-2.7h-2.7V9.5c0-.8.2-1.3 1.4-1.3H16V5.8c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5v1.9H8v2.7h2.6V21h2.9Z" />
        </svg>
        {fb}
      </a>,
    );
  }
  if (venue.tiktok) {
    const tk = venue.tiktok.replace(/^@/, '').replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, '');
    rows.push(
      <a key="tk" href={`https://tiktok.com/@${tk}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm" style={{ color: theme.text }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
          <path d="M16.5 3c.3 2 1.5 3.6 3.5 3.9v2.6c-1.3 0-2.5-.4-3.5-1.1v5.9a5.4 5.4 0 1 1-5.4-5.4c.3 0 .5 0 .8.1v2.7a2.8 2.8 0 1 0 2 2.7V3h2.6Z" />
        </svg>
        @{tk}
      </a>,
    );
  }
  if (venue.twitter) {
    const tw = venue.twitter.replace(/^@/, '').replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//, '');
    rows.push(
      <a key="tw" href={`https://x.com/${tw}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm" style={{ color: theme.text }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
          <path d="M17.5 3h3l-6.6 7.5L21.7 21h-6l-4.7-6.1L5.6 21H2.5l7-8L2.6 3h6.1l4.2 5.6L17.5 3Zm-1 16h1.6L7.6 4.7H5.9L16.5 19Z" />
        </svg>
        @{tw}
      </a>,
    );
  }
  if (!rows.length && !children) return null;
  return (
    <div className="mt-auto pt-8">
      <div className="mb-4 text-xl font-bold" style={{ color: theme.text }}>
        Get in touch
      </div>
      <div className="flex flex-col gap-4">
        {rows}
        {children}
      </div>
    </div>
  );
}

/** Slide-in side drawer (hamburger) with optional category links + contact. */
export function SideDrawer({
  open,
  onClose,
  venue,
  theme,
  accent,
  links,
}: {
  open: boolean;
  onClose: () => void;
  venue: PublicVenue;
  theme: MenuTheme;
  accent: string;
  links?: { id: string; label: string; onClick: () => void }[];
}) {
  const [reserveOpen, setReserveOpen] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] flex">
      <div className="menu-scrim absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <aside
        className="menu-drawer relative flex h-full w-[84%] max-w-sm flex-col overflow-y-auto px-6 py-5"
        style={{ backgroundColor: theme.bg, borderRight: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-[0.25em]" style={{ color: accent }}>
            {venue.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl"
            style={{ color: accent }}
          >
            ✕
          </button>
        </div>

        {links && links.length > 0 && (
          <nav className="mt-8 flex flex-col gap-1">
            {links.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  l.onClick();
                  onClose();
                }}
                className="rounded-lg px-3 py-3 text-left text-lg font-semibold transition-colors"
                style={{ color: theme.text }}
              >
                {l.label}
              </button>
            ))}
          </nav>
        )}

        <DrawerContact venue={venue} theme={theme} accent={accent}>
          <button
            type="button"
            onClick={() => setReserveOpen(true)}
            className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-wider transition-transform active:scale-95"
            style={{ backgroundColor: accent, color: theme.bg, borderRadius: theme.radius }}
          >
            Reserve a table
          </button>
        </DrawerContact>
      </aside>
      <ReservationSheet
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        venue={venue}
        theme={theme}
        accent={accent}
      />
    </div>
  );
}

/**
 * Shared bottom-sheet dish detail. Renders nothing when `item` is null.
 * position:fixed → covers the viewport on the guest page; inside the preview
 * device frame a transform ancestor contains it to the frame.
 */
export function ItemSheet({
  item,
  venue,
  theme,
  accent,
  onClose,
}: {
  item: PublicMenuItem | null;
  venue: PublicVenue;
  theme: MenuTheme;
  accent: string;
  onClose: () => void;
}) {
  if (!item) return null;
  return (
    <div
      className="menu-scrim fixed inset-0 z-40 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="menu-sheet w-full overflow-hidden"
        style={{
          maxWidth: '760px',
          backgroundColor: theme.surface,
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {item.imageUrl && (
          <DishImage
            src={item.imageUrl}
            className="h-56 w-full object-cover"
            fallback={
              <div
                className="flex h-56 w-full items-center justify-center text-5xl font-bold"
                style={{ backgroundColor: `${accent}1F`, color: accent, fontFamily: theme.headingFont }}
              >
                {item.name.charAt(0).toUpperCase()}
              </div>
            }
          />
        )}
        <div className="flex items-start justify-between gap-3 p-6">
          <div className="min-w-0">
            <h3 className="text-xl font-bold" style={{ color: theme.text, fontFamily: theme.headingFont }}>
              {item.name}
            </h3>
            {item.description && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.muted }}>
                {item.description}
              </p>
            )}
            {venue.showPrices && (
              <p className="mt-4 text-xl font-bold" style={{ color: accent }}>
                {formatMenuPrice(item.price, venue.currency)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl"
            style={{ color: theme.bg, backgroundColor: accent }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

/** Root wrapper every template uses: bg, base font, smooth scrolling. */
export function TemplateRoot({
  theme,
  children,
}: {
  theme: MenuTheme;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: theme.bodyFont,
        scrollBehavior: 'smooth',
      }}
    >
      {children}
    </div>
  );
}
