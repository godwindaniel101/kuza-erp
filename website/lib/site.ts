/**
 * Site-wide constants + URL helpers for SEO.
 *
 * The canonical/OG/sitemap machinery all needs one absolute origin. It comes
 * from NEXT_PUBLIC_SITE_URL when set (e.g. in production), with a sensible
 * fallback to the marketing domain the footer/menu already point at.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kuza.africa'
).replace(/\/+$/, '');

export const SITE_NAME = 'Kuza';

/**
 * Default social-share image. Points at a real image that ships in
 * `website/public` so OG/Twitter cards work out of the box. For best results a
 * dedicated 1200x630 card (e.g. /og-cover.png) should be added and passed to
 * <Seo image="/og-cover.png" /> — see the note in the PR summary.
 */
export const DEFAULT_OG_IMAGE = '/img/woman-selling.jpeg';

/** Turn a path (or already-absolute URL) into an absolute URL on SITE_URL. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
