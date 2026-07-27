import Head from 'next/head';
import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl } from '../lib/site';

export interface SeoProps {
  /** Full, unique <title> for the page. */
  title: string;
  /** Meta description (~150–160 chars, keyword-rich). */
  description: string;
  /** Canonical path for this page, e.g. '/inventory' or '/'. */
  path: string;
  /** Share image (path on the site or an absolute URL). Defaults to the site card. */
  image?: string;
  /** Open Graph object type. */
  ogType?: 'website' | 'article' | 'product';
  /** One JSON-LD object, or several, injected as <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Set for pages that should not be indexed. */
  noindex?: boolean;
}

/**
 * Single source of truth for a page's <head> SEO: title, description,
 * canonical, Open Graph, Twitter card, and optional structured data.
 * Every marketing page renders exactly one <Seo>.
 */
export default function Seo({
  title,
  description,
  path,
  image,
  ogType = 'website',
  jsonLd,
  noindex,
}: SeoProps) {
  const canonical = absoluteUrl(path);
  const ogImage = absoluteUrl(image || DEFAULT_OG_IMAGE);
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured data */}
      {blocks.map((block, i) => (
        <script
          // eslint-disable-next-line react/no-danger
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </Head>
  );
}
