import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.svg" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Meta tags */}
        <meta name="theme-color" content="#4f46e5" />
        <meta name="description" content="Kuza — QR menus, honest stock and books that write themselves. Built for African business." />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
