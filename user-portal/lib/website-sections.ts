/**
 * Website builder section model (Phase 2). The WebsiteSite.sections jsonb column
 * stores an ordered array of these typed blocks; the builder edits them and the
 * public renderer (pages/site/[slug].tsx) renders the enabled ones in order.
 * All fields are plain strings/arrays so the whole thing round-trips through jsonb.
 */

export type SectionType = 'hero' | 'text' | 'features' | 'products' | 'gallery' | 'cta' | 'contact';

/**
 * Background treatment a block paints for itself. Lets a template mix light,
 * warm (cream), dark (near-black) and tint (soft accent wash) sections so the
 * page reads as designed rather than uniformly white. Absent ⇒ 'light'.
 */
export type Surface = 'light' | 'warm' | 'dark' | 'tint';

interface BaseSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  /** Section background treatment. Backward compatible: absent ⇒ 'light'. */
  bg?: Surface;
}

/** Visual treatment for the hero block. Optional — defaults to 'fullbleed'. */
export type HeroVariant = 'fullbleed' | 'split' | 'centered';

export interface HeroSection extends BaseSection {
  type: 'hero';
  headline: string;
  subtext: string;
  imageUrl: string | null;
  ctaLabel: string;
  ctaHref: string;
  /** Layout style. Backward compatible: absent ⇒ 'fullbleed' (today's behaviour). */
  variant?: HeroVariant;
  /** Small label above the headline (e.g. "New collection"). Optional. */
  eyebrow?: string;
}
export interface TextSection extends BaseSection {
  type: 'text';
  heading: string;
  body: string;
  imageUrl: string | null;
}
export interface GallerySection extends BaseSection {
  type: 'gallery';
  heading: string;
  images: string[];
}
export interface CtaSection extends BaseSection {
  type: 'cta';
  heading: string;
  subtext: string;
  buttonLabel: string;
  buttonHref: string;
}
export interface ContactSection extends BaseSection {
  type: 'contact';
  heading: string;
}
export interface ProductsSection extends BaseSection {
  type: 'products';
  heading: string;
  /** How many products to pull from the linked Storefront. */
  limit: number;
}

/** One row/card in a features block. `icon` is a Boxicons class (e.g. 'bx-bolt'). */
export interface FeatureItem {
  title: string;
  body: string;
  icon?: string;
}
export interface FeaturesSection extends BaseSection {
  type: 'features';
  heading: string;
  subtext: string;
  /** numbered (01/02/03 rows), icons (icon grid), or cards. Absent ⇒ 'cards'. */
  layout?: 'numbered' | 'icons' | 'cards';
  items: FeatureItem[];
}

export type WebsiteSection =
  | HeroSection
  | TextSection
  | FeaturesSection
  | ProductsSection
  | GallerySection
  | CtaSection
  | ContactSection;

export const SECTION_TYPES: { type: SectionType; label: string; icon: string }[] = [
  { type: 'hero', label: 'Hero', icon: 'bx-images' },
  { type: 'text', label: 'Text & image', icon: 'bx-text' },
  { type: 'features', label: 'Features', icon: 'bx-list-check' },
  { type: 'products', label: 'Products', icon: 'bx-shopping-bag' },
  { type: 'gallery', label: 'Gallery', icon: 'bx-grid-alt' },
  { type: 'cta', label: 'Call to action', icon: 'bx-pointer' },
  { type: 'contact', label: 'Contact', icon: 'bx-envelope' },
];

export const sectionLabel = (type: SectionType): string =>
  SECTION_TYPES.find((s) => s.type === type)?.label ?? type;

function makeId(type: SectionType): string {
  return `sec_${type}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newSection(type: SectionType): WebsiteSection {
  const base = { id: makeId(type), enabled: true };
  switch (type) {
    case 'hero':
      return { ...base, type, headline: '', subtext: '', imageUrl: null, ctaLabel: 'Shop now', ctaHref: '' };
    case 'text':
      return { ...base, type, heading: '', body: '', imageUrl: null };
    case 'features':
      return {
        ...base, type, heading: 'Why choose us', subtext: '', layout: 'cards',
        items: [
          { title: 'Fast delivery', body: 'Orders out the door the same day.', icon: 'bx-package' },
          { title: 'Fair prices', body: 'Honest pricing, no surprises.', icon: 'bx-purchase-tag' },
          { title: 'Real support', body: 'Talk to a human when you need one.', icon: 'bx-support' },
        ],
      };
    case 'products':
      return { ...base, type, heading: 'Featured products', limit: 6 };
    case 'gallery':
      return { ...base, type, heading: '', images: [] };
    case 'cta':
      return { ...base, type, heading: '', subtext: '', buttonLabel: 'Shop now', buttonHref: '' };
    case 'contact':
      return { ...base, type, heading: 'Get in touch' };
  }
}

/** A sensible default arrangement for a first-time site. */
export function starterSections(): WebsiteSection[] {
  const hero = newSection('hero') as HeroSection;
  hero.headline = 'Welcome';
  hero.subtext = 'A short line about what you do';
  const about = newSection('text') as TextSection;
  about.heading = 'About us';
  about.body = 'Tell your story — who you are, what you sell, and why customers trust you.';
  return [hero, about, newSection('cta'), newSection('contact')];
}
