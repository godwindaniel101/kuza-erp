import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import ServiceSwitcher from './ServiceSwitcher';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AppHeader({ title = 'dashboard', subtitle }: AppHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation('common');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode');
      if (stored !== null) {
        return stored === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const userMenuRef = useRef<HTMLDivElement>(null);
  const darkModeIconRef = useRef<HTMLElement>(null);
  const isHRMS = router.pathname.startsWith('/hrms');
  const serviceColor = isHRMS ? 'blue' : 'red';

  useEffect(() => {
    // Sync with actual DOM state on mount
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
    updateDarkModeIcon(isDark);

    // Listen for dark mode changes from other components
    const handleDarkModeChange = (event?: CustomEvent) => {
      const newDarkState = event?.detail?.dark ?? document.documentElement.classList.contains('dark');
      setDarkMode(newDarkState);
      updateDarkModeIcon(newDarkState);
    };
    
    window.addEventListener('dark-mode-changed', handleDarkModeChange as EventListener);
    
    // Watch for class changes on html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          setDarkMode(isDark);
          updateDarkModeIcon(isDark);
        }
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => {
      window.removeEventListener('dark-mode-changed', handleDarkModeChange as EventListener);
      observer.disconnect();
    };
  }, []);

  const updateDarkModeIcon = (isDark: boolean) => {
    if (darkModeIconRef.current) {
      darkModeIconRef.current.classList.remove('bx-moon', 'bx-sun');
      darkModeIconRef.current.classList.add(isDark ? 'bx-sun' : 'bx-moon');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    const newDarkState = !isDark;

    // Update DOM immediately
    if (newDarkState) {
      html.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }

    // Force a reflow to ensure styles update
    void html.offsetHeight;

    // Update state
    setDarkMode(newDarkState);
    updateDarkModeIcon(newDarkState);
    
    // Dispatch event for other components to sync
    window.dispatchEvent(new CustomEvent('dark-mode-changed', { detail: { dark: newDarkState } }));
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="dashboard-header sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Page title and mobile menu */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              const event = new CustomEvent('toggle-mobile-menu');
              window.dispatchEvent(event);
            }}
            className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <i className="bx bx-menu text-2xl"></i>
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t(title) || title}</h2>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t(subtitle) || subtitle}</p>}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* Quick Actions - New Order (RMS only) */}
          {!isHRMS && (
            <div className="hidden md:flex items-center space-x-2">
              <Link
                href="/rms/orders/create"
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm"
              >
                <i className="bx bx-plus"></i>
                <span>{t('newOrder')}</span>
              </Link>
            </div>
          )}

          {/* Service Switcher */}
          <ServiceSwitcher />

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group dark-mode-toggle-btn cursor-pointer"
            title={t('toggleDarkMode') || 'Toggle dark mode'}
            aria-label={t('toggleDarkMode') || 'Toggle dark mode'}
            id="dark-mode-toggle"
          >
            <i
              ref={darkModeIconRef}
              className="bx bx-moon text-xl text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 dark-mode-icon"
            ></i>
          </button>

          {/* User Avatar with Dropdown */}
          <div className="relative z-50" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                serviceColor === 'red' ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600'
              } flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1"
                style={{ display: userMenuOpen ? 'block' : 'none' }}
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || 'user@example.com'}</p>
                  {user?.businessId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">Restaurant</p>
                  )}
                </div>
                <Link
                  href="/profile"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <i className="bx bx-user mr-3 text-lg"></i> {t('profile')}
                </Link>
                <Link
                  href={isHRMS ? '/hrms/settings' : '/settings'}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <i className="bx bx-cog mr-3 text-lg"></i> {t('settings')}
                </Link>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  onClick={handleLogout}
                  className={`flex items-center w-full px-4 py-2 text-sm ${
                    serviceColor === 'red'
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <i className="bx bx-log-out mr-3 text-lg"></i> {t('signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
