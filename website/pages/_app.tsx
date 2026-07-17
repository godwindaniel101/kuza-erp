import type { AppProps } from 'next/app';
import Script from 'next/script';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      {/* Shared marketing behaviour: nav dropdown, mobile drawer, header shadow,
          scroll-reveal, count-up, FAQ, and app-link rewriting. Runs after the
          React markup is interactive. */}
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
