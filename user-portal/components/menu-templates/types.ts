import { PublicMenuData } from '@/lib/menu-public';

/**
 * A theme is a token set consumed by a layout archetype. Colors are applied
 * via inline styles (they are data, not Tailwind classes); layout/spacing is
 * Tailwind. Font stacks are system-only so the guest page ships zero webfonts.
 */
export interface MenuTheme {
  key: string;
  name: string;
  mode: 'light' | 'dark';
  /** Page background (may include a subtle gradient). */
  bg: string;
  /** Card / elevated surface background. */
  surface: string;
  /** Primary text color. */
  text: string;
  /** Secondary / muted text color. */
  muted: string;
  /** Accent color (prices, rules, active states). */
  accent: string;
  /** Hairline / border color. */
  border: string;
  headingFont: string;
  bodyFont: string;
  /** Corner radius for cards, e.g. '14px'. */
  radius: string;
}

export interface TemplateProps {
  data: PublicMenuData;
  theme: MenuTheme;
}

export type TemplateKey =
  | 'elegant'
  | 'minimal'
  | 'noir'
  | 'gallery'
  | 'bistro'
  | 'grand'
  // Premium, image-forward archetypes
  | 'escape'
  | 'botanical'
  | 'sakura'
  | 'roast'
  | 'space';

export const SERIF_STACK =
  "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', serif";
export const SANS_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
export const ROUNDED_STACK =
  "'Avenir Next Rounded', 'Trebuchet MS', 'Segoe UI', Verdana, sans-serif";
