import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/authStore';
import { useSearchStore } from '@/store/searchStore';
import BrandMark from './BrandMark';
import Icon, { IconName } from './ui/Icon';

/**
 * Kuza · Admin shell — the platform back-office layout, deliberately distinct
 * from the tenant portal. A fixed sidebar + slim top bar wrap every admin page.
 *
 * Guarding lives here (UX only; every /admin API is enforced server-side by a
 * SuperAdminGuard): no `auth_token` → /login; a signed-in user who is NOT a
 * super-admin is signed out and bounced to /login. The login route renders bare.
 */

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  isActive: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: 'home', isActive: (p) => p === '/' },
  {
    href: '/tenants',
    label: 'Tenants',
    icon: 'building-office',
    isActive: (p) => p.startsWith('/tenants'),
  },
  { href: '/plans', label: 'Plans', icon: 'squares-2x2', isActive: (p) => p.startsWith('/plans') },
  { href: '/pricing', label: 'Pricing', icon: 'banknotes', isActive: (p) => p.startsWith('/pricing') },
  {
    href: '/requests',
    label: 'Access requests',
    icon: 'bell',
    isActive: (p) => p.startsWith('/requests'),
  },
];

// Give the admin console its own indigo accent (the tenant portal reads blue).
// Scoped to this subtree via CSS custom properties consumed by bg-brand-gradient
// / focus rings across the shared UI kit.
const ADMIN_ACCENT = {
  ['--accent']: '#4f46e5',
  ['--accent-hover']: '#4338ca',
  ['--accent-fg']: '#ffffff',
  ['--accent-ring']: '#6366f1',
  ['--accent-soft']: 'color-mix(in srgb, #4f46e5 12%, transparent)',
  ['--accent-grad']: 'linear-gradient(120deg, #6366f1 0%, #4f46e5 100%)',
  ['--accent-grad-hover']: 'linear-gradient(120deg, #4f46e5 0%, #4338ca 100%)',
} as CSSProperties;

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas dark:bg-gray-950">
      <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-brand-600" />
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser, logout } = useAuthStore();
  const { enabled, placeholder, query, setQuery } = useSearchStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const bootstrapped = useRef(false);

  const isLoginRoute = router.pathname === '/login';

  // Resolve the session once on mount for protected routes. fetchUser() clears
  // the cookie + user on a definitive 401/403; the redirect effect handles the
  // bounce to /login.
  useEffect(() => {
    if (isLoginRoute || bootstrapped.current) return;
    bootstrapped.current = true;
    const token = typeof window !== 'undefined' ? Cookies.get('auth_token') : null;
    if (token && !user) {
      fetchUser().catch(() => {
        /* transient — leave session intact, next nav retries */
      });
    }
  }, [isLoginRoute, user, fetchUser]);

  // Guard: bounce to /login when there is no session, and sign out any
  // authenticated user who isn't a platform super-admin.
  useEffect(() => {
    if (isLoginRoute) return;
    const token = typeof window !== 'undefined' ? Cookies.get('auth_token') : null;
    if (!token && !isLoading) {
      router.replace('/login');
      return;
    }
    if (user && !user.isSuperAdmin) {
      logout();
      router.replace('/login');
    }
  }, [isLoginRoute, user, isLoading, router, logout]);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [router.pathname]);

  // The login page owns its own minimal auth layout.
  if (isLoginRoute) {
    return <div style={ADMIN_ACCENT}>{children}</div>;
  }

  const token = typeof window !== 'undefined' ? Cookies.get('auth_token') : null;

  // Resolving the session, or an authenticated non-super-admin being bounced —
  // or no session at all (the redirect effect is navigating to /login).
  if (isLoading || (token && !user) || !user || !isAuthenticated || !user.isSuperAdmin || !token) {
    return (
      <div style={ADMIN_ACCENT}>
        <Spinner />
      </div>
    );
  }

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100 dark:border-gray-800">
        <BrandMark size={32} className="rounded-lg shadow-card" />
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white">
            Kuza
          </p>
          <p className="text-2xs font-semibold uppercase tracking-wider text-accent">Admin</p>
        </div>
      </div>

      <ul className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = item.isActive(router.pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-brand-gradient text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <Icon name={item.icon} size={18} className={active ? 'text-white' : ''} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3">
        <p className="text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Platform console
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
      </div>
    </nav>
  );

  return (
    <div
      style={ADMIN_ACCENT}
      className="flex h-dvh md:h-screen overflow-hidden bg-canvas dark:bg-gray-950"
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-60 max-w-[80%] bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-4 sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Icon name="bars-3" size={20} />
          </button>

          <div className="relative flex-1 max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon name="search" size={18} />
            </span>
            <input
              type="search"
              value={enabled ? query : ''}
              disabled={!enabled}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={enabled ? placeholder : 'Search'}
              className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 pr-3 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate max-w-[16rem]">
                {user.name || user.email}
              </p>
              <p className="text-2xs text-gray-400 dark:text-gray-500">Super admin</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
              {(user.name || user.email || '?').charAt(0).toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Icon name="logout" size={18} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
