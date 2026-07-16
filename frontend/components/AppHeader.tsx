import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/globalStore';
import { getApp, presetFor } from '@/lib/apps';
import { availableCoarseApps, appDisplayName, hasAppKey } from '@/lib/appCatalog';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import Icon from './ui/Icon';
import Button from './ui/Button';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AppHeader({ title = 'dashboard', subtitle }: AppHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation('common');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const isHRMS = router.pathname.startsWith('/hrms');
  const { businessType, effectiveApps, availableGroups, setActiveWorkspace } = useTenantStore();
  // "New Order" is a Restaurant action — only show it inside the Restaurant app,
  // never on Inventory/Sales/Accounting pages (would flip the sidebar to Restaurant).
  const showNewOrder = router.pathname.startsWith('/rms') && (businessType === 'restaurant' || businessType === null);

  // Launcher entries: the coarse apps the tenant can access — the same 7 the
  // sidebar uses (Restaurant/POS, Inventory, Sales, Accounting, People, Settings),
  // not granular registry keys.
  const launcherApps = availableCoarseApps(effectiveApps);

  /** App key -> candidate sidebar groups, in priority order (first effective wins). */
  const APP_GROUP_CANDIDATES: Record<string, string[]> = {
    pos: ['restaurant'],
    tables: ['restaurant'],
    menu: ['restaurant', 'menu-studio'],
    'kuza-menu': ['menu-studio'],
    items: ['inventory'],
    'goods-in': ['inventory'],
    customers: ['sales', 'money'],
    invoicing: ['sales', 'money'],
    books: ['accounting', 'money'],
    insights: ['accounting', 'money'],
    people: ['hr'],
    payroll: ['hr'],
  };

  // Launching an app also sets the workspace so sidebar and workspace stay coherent.
  const workspaceForApp = (appKey: string): string => {
    const candidates = APP_GROUP_CANDIDATES[appKey] ?? [];
    return candidates.find((c) => availableGroups.includes(c)) ?? 'all';
  };

  // Quick-create ("+") menu: creators only for apps the tenant actually has.
  const quickCreateItems = (
    [
      { label: 'New Sale', href: '/pos', icon: 'banknotes', key: 'pos' },
      { label: 'New Invoice', href: '/sales/invoices/new', icon: 'document-text', key: 'invoicing' },
      { label: 'Add Item', href: '/ims/inventory', icon: 'cube', key: 'items' },
      { label: 'Add Employee', href: '/hrms/employees/create', icon: 'user', key: 'people' },
      { label: 'New Journal Entry', href: '/accounting/journal-entries/new', icon: 'book-open', key: 'books' },
    ] as { label: string; href: string; icon: Parameters<typeof Icon>[0]['name']; key: string }[]
  ).filter((it) => hasAppKey(it.key, effectiveApps));

  // Global search routes the query to the most relevant list for the active module.
  const SEARCH_TARGETS: [string, string][] = [
    ['/hrms', '/hrms/employees'],
    ['/pos', '/ims/inventory'],
    ['/ims', '/ims/inventory'],
    ['/sales', '/sales/invoices'],
    ['/accounting', '/accounting/journal-entries'],
    ['/rms', '/rms/orders'],
  ];

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    const match = SEARCH_TARGETS.find(([prefix]) => router.pathname.startsWith(prefix));
    const target = match ? match[1] : '/ims/inventory';
    router.push({ pathname: target, query: { search: q } });
    setMobileSearchOpen(false);
  };

  useEffect(() => {
    // Sync with actual DOM state on mount
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);

    // Listen for dark mode changes from other components
    const handleDarkModeChange = (event?: CustomEvent) => {
      const newDarkState = event?.detail?.dark ?? document.documentElement.classList.contains('dark');
      setDarkMode(newDarkState);
    };

    window.addEventListener('dark-mode-changed', handleDarkModeChange as EventListener);

    // Watch for class changes on html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      window.removeEventListener('dark-mode-changed', handleDarkModeChange as EventListener);
      observer.disconnect();
    };
  }, []);

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

  // App launcher: close on outside click or Escape.
  useEffect(() => {
    if (!launcherOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (launcherRef.current && !launcherRef.current.contains(event.target as Node)) {
        setLauncherOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLauncherOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [launcherOpen]);

  // Quick-create menu: close on outside click or Escape.
  useEffect(() => {
    if (!quickCreateOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target as Node)) {
        setQuickCreateOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQuickCreateOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [quickCreateOpen]);

  // Mobile search: close on outside click or Escape; focus input when opened.
  useEffect(() => {
    if (!mobileSearchOpen) return;
    mobileSearchInputRef.current?.focus();
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('#mobile-search-toggle')) return;
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(target)) {
        setMobileSearchOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileSearchOpen]);

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

    setDarkMode(newDarkState);

    // Dispatch event for other components to sync
    window.dispatchEvent(new CustomEvent('dark-mode-changed', { detail: { dark: newDarkState } }));
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const iconButton =
    'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 ' +
    'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 ' +
    'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

  return (
    <header className="dashboard-header sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: mobile menu + breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const event = new CustomEvent('toggle-mobile-menu');
              window.dispatchEvent(event);
            }}
            className={`lg:hidden ${iconButton}`}
            aria-label="Open menu"
          >
            <Icon name="bars-3" size={20} />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
            {subtitle && (
              <>
                <span className="hidden sm:block truncate text-gray-400 dark:text-gray-500">
                  {t(subtitle) || subtitle}
                </span>
                <Icon
                  name="chevron-right"
                  size={12}
                  className="hidden sm:block text-gray-300 dark:text-gray-600"
                />
              </>
            )}
            <span className="truncate font-medium text-gray-900 dark:text-gray-100">{t(title) || title}</span>
          </nav>
        </div>

        {/* Center: global search */}
        <div className="hidden md:flex flex-1 justify-center px-4">
          <form onSubmit={handleSearchSubmit} role="search" className="relative w-full max-w-md">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search') || 'Search'}
              aria-label="Search"
              className="h-9 w-full rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 pl-10 pr-12 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-2xs font-medium text-gray-400 dark:text-gray-500">
              ↵
            </kbd>
          </form>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          {showNewOrder && (
            <div className="hidden md:block mr-1">
              <Button href="/rms/orders/create" size="sm">
                <Icon name="plus" size={14} />
                {t('newOrder')}
              </Button>
            </div>
          )}

          {/* Mobile: search toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            id="mobile-search-toggle"
            aria-label={t('search') || 'Search'}
            aria-expanded={mobileSearchOpen}
            title={t('search') || 'Search'}
            className={`md:hidden ${iconButton}`}
          >
            <Icon name="search" size={18} />
          </button>

          {/* Quick-create ("+") menu */}
          <div className="relative" ref={quickCreateRef}>
            <button
              type="button"
              onClick={() => setQuickCreateOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={quickCreateOpen}
              aria-label="Create new"
              title="Create new"
              className={iconButton}
            >
              <Icon name="plus" size={18} />
            </button>

            {quickCreateOpen && (
              <div
                role="menu"
                aria-label="Create new"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1.5 shadow-popover"
              >
                <p className="px-2.5 pb-1 pt-1 text-2xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Create
                </p>
                {quickCreateItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setQuickCreateOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                      <Icon name={item.icon} size={15} />
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* App launcher (Google-style grid) */}
          <div className="relative" ref={launcherRef}>
            <button
              type="button"
              onClick={() => setLauncherOpen(!launcherOpen)}
              aria-haspopup="menu"
              aria-expanded={launcherOpen}
              aria-label="Apps"
              title="Apps"
              className={iconButton}
            >
              <Icon name="squares-2x2" size={18} />
            </button>

            {launcherOpen && (
              <div
                role="menu"
                aria-label="Apps"
                className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-popover"
              >
                <div className="grid grid-cols-3 gap-1 p-2 max-h-80 overflow-y-auto">
                  {launcherApps.map((app) => (
                    <Link
                      key={app.id}
                      href={app.home}
                      role="menuitem"
                      onClick={() => setLauncherOpen(false)}
                      className="flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-center transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <Icon name={app.icon} size={18} />
                      </span>
                      <span className="w-full truncate text-2xs font-medium text-gray-700 dark:text-gray-300">
                        {appDisplayName(app, businessType)}
                      </span>
                    </Link>
                  ))}
                  {launcherApps.length === 0 && (
                    <p className="col-span-3 px-2 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                      No apps enabled yet
                    </p>
                  )}
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
                  <Link
                    href="/settings/apps"
                    role="menuitem"
                    onClick={() => setLauncherOpen(false)}
                    className="flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-medium text-brand-600 dark:text-brand-400 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                  >
                    Manage apps
                    <Icon name="chevron-right" size={12} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <button type="button" className={`relative ${iconButton}`} aria-label="Notifications">
            <Icon name="bell" size={18} />
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={toggleDarkMode}
            className={`${iconButton} dark-mode-toggle-btn`}
            title={t('toggleDarkMode') || 'Toggle dark mode'}
            aria-label={t('toggleDarkMode') || 'Toggle dark mode'}
            id="dark-mode-toggle"
          >
            <Icon name={darkMode ? 'sun' : 'moon'} size={18} />
          </button>

          {/* User avatar + name/email with dropdown */}
          <div className="relative z-50 ml-1" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              className="flex items-center gap-2 rounded-full p-0.5 sm:pr-2 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-[13px] font-semibold text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
              <span className="hidden sm:block min-w-0 max-w-[140px] text-left leading-tight">
                <span className="block truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
                  {user?.name || 'User'}
                </span>
                <span className="block truncate text-2xs text-gray-500 dark:text-gray-400">
                  {user?.email || ''}
                </span>
              </span>
              <Icon
                name="chevron-down"
                size={12}
                className="hidden sm:block text-gray-400 dark:text-gray-500 shrink-0"
              />
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1.5 shadow-popover"
              >
                <div className="border-b border-gray-100 dark:border-gray-800 px-2.5 pb-2.5 pt-1.5">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{user?.name || 'User'}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
                <div className="pt-1.5">
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Icon name="user" size={16} className="text-gray-400 dark:text-gray-500" />
                    {t('profile')}
                  </Link>
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Icon name="cog" size={16} className="text-gray-400 dark:text-gray-500" />
                    {t('settings')}
                  </Link>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-red-600 dark:text-red-400 transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Icon name="logout" size={16} />
                    {t('signOut')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: collapsible global search bar */}
      {mobileSearchOpen && (
        <div
          ref={mobileSearchRef}
          className="md:hidden absolute inset-x-0 top-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2.5 shadow-popover"
        >
          <form onSubmit={handleSearchSubmit} role="search" className="relative">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              ref={mobileSearchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search') || 'Search'}
              aria-label="Search"
              className="h-9 w-full rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 pl-10 pr-3 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
            />
          </form>
        </div>
      )}
    </header>
  );
}
