import type { AppProps } from 'next/app';
import Head from 'next/head';
import { appWithTranslation } from 'next-i18next';
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google';
import Layout from '@/components/Layout';
import '@/styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

// Kuza type system (self-hosted at build — no runtime CDN). Bricolage Grotesque
// is the characterful display voice (headings + big numbers); Hanken Grotesk is
// the clean humanist body with tabular figures for data-dense dashboards.
const fontDisplay = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});
const fontBody = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Apply the theme. Light is the default; dark applies only when the user has
  // explicitly turned it on (darkMode='true'). We no longer follow the OS
  // preference. A one-time reset (themeResetV1) clears any previously-saved dark
  // once, so existing users open light — they can still toggle dark afterwards.
  useEffect(() => {
    if (!localStorage.getItem('themeResetV1')) {
      localStorage.removeItem('darkMode');
      localStorage.setItem('themeResetV1', '1');
    }
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // The app font CSS variables (--font-display / --font-body) are set on a
  // wrapper <div> around the page. Modals render via createPortal(document.body)
  // — a SIBLING of that wrapper — so they don't inherit the variables and fall
  // back to a system font. Mirror the font variables (+ font-sans) onto <body>
  // so portaled UI (modals, receipts) uses the same fonts as the rest of the app.
  useEffect(() => {
    const classes = `${fontDisplay.variable} ${fontBody.variable} font-sans`
      .split(' ')
      .filter(Boolean);
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, []);

  // Ensure locale matches cookie preference on first load
  useEffect(() => {
    const cookieLang = Cookies.get('lang');
    if (cookieLang && router.locale !== cookieLang) {
      // Replace to avoid adding to history stack
      router.replace(router.asPath, router.asPath, { locale: cookieLang });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PWA: register the service worker (production only — caching in dev makes
  // stale-build debugging miserable). Writes are never intercepted by the SW.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-fatal: the app works identically without the SW.
      });
    }
  }, []);

  return (
    <>
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>Kuza</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // One-time reset to the new light default: clear any prior dark
                  // preference once so existing users open light. Dark applies only
                  // when explicitly turned on afterwards; the OS preference is not
                  // followed. Runs before paint, so there is no flash.
                  if (!localStorage.getItem('themeResetV1')) {
                    localStorage.removeItem('darkMode');
                    localStorage.setItem('themeResetV1', '1');
                  }
                  const isDark = localStorage.getItem('darkMode') === 'true';
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Simple dark mode toggle and icon update
              (function() {
                function updateDarkModeIcon() {
                  const html = document.documentElement;
                  const isDark = html.classList.contains('dark');
                  const icon = document.querySelector('#dark-mode-toggle .dark-mode-icon');
                  
                  if (icon) {
                    // Remove bx-moon or bx-sun classes
                    icon.classList.remove('bx-moon', 'bx-sun');
                    // Add the appropriate icon based on current state
                    // If dark mode is ON, show sun icon (to turn it off)
                    // If dark mode is OFF, show moon icon (to turn it on)
                    icon.classList.add(isDark ? 'bx-sun' : 'bx-moon');
                  }
                }
                
                // Update icon immediately and on page load
                updateDarkModeIcon();
                
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', updateDarkModeIcon);
                }
                
                // Listen for dark mode changes
                window.addEventListener('dark-mode-changed', function() {
                  setTimeout(updateDarkModeIcon, 10);
                });
                
                // Watch for class changes on html element
                const observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                      updateDarkModeIcon();
                    }
                  });
                });
                observer.observe(document.documentElement, {
                  attributes: true,
                  attributeFilter: ['class']
                });
              })();
            `,
          }}
        />
      </Head>
      <div className={`${fontDisplay.variable} ${fontBody.variable} contents font-sans`}>
        <Layout>
          {/* Elegant page transition: fades/slides in on real route changes,
              keyed on the route (not query) so filters/tabs don't re-animate. */}
          <div key={router.pathname} className="page-enter">
            <Component {...pageProps} />
          </div>
        </Layout>
      </div>
    </>
  );
}

export default appWithTranslation(App);

