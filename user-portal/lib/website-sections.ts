/**
 * Website builder section model (Phase 2). The WebsiteSite.sections jsonb column
 * stores an ordered array of these typed blocks; the builder edits them and the
 * public renderer (pages/site/[slug].tsx) renders the enabled ones in order.
 * All fields are plain strings/arrays so the whole thing round-trips through jsonb.
 */

export type SectionType = 'hero' | 'text' | 'gallery' | 'cta' | 'contact';

interface BaseSection {
  id: string;
  type: SectionType;
  enabled: boolean;
}

export interface HeroSection extends BaseSection {
  type: 'hero';
  headline: string;
  subtext: string;
  imageUrl: string | null;
  ctaLabel: string;
  ctaHref: string;
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

export type WebsiteSection =
  | HeroSection
  | TextSection
  | GallerySection
  | CtaSection
  | ContactSection;

export const SECTION_TYPES: { type: SectionType; label: string; icon: string }[] = [
  { type: 'hero', label: 'Hero', icon: 'bx-images' },
  { type: 'text', label: 'Text & image', icon: 'bx-text' },
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
