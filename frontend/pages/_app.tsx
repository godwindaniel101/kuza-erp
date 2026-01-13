import type { AppProps } from 'next/app';
import Head from 'next/head';
import { appWithTranslation } from 'next-i18next';
import Layout from '@/components/Layout';
import '@/styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Initialize dark mode before React hydrates to prevent flash
  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    const isDark = stored === 'true' || (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

  return (
    <>
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>ERP Platform</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('darkMode');
                  const isDark = stored === 'true' || (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
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
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default appWithTranslation(App);

