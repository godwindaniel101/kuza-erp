import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.svg" />
        
        {/* Meta tags */}
        <meta name="theme-color" content="#dc2626" />
        <meta name="description" content="ERP Platform - Complete Enterprise Resource Planning System" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

