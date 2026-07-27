import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        {/* Brand theme colour for mobile browser chrome */}
        <meta name="theme-color" content="#2e56d3" />
        {/* Per-page tags (title, description, canonical, OG, viewport) come from
            the <Seo> component — do not duplicate them here. */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
