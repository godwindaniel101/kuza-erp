import { ReactNode, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/globalStore';
import { useUiStore } from '@/store/uiStore';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import OnboardingModal from './OnboardingModal';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Head from 'next/head';
import { api } from '@/lib/api';
import { isPathAllowed, requiredAppKeys } from '@/lib/appAccess';
import { getApp } from '@/lib/apps';
import Toast from './Toast';
import KuzaCopilot from './KuzaCopilot';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { isAuthenticated, isLoading, fetchUser, user } = useAuthStore();
  const { businessType, effectiveApps } = useTenantStore();
  const { sidebarCollapsed } = useUiStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [branchContext, setBranchContext] = useState<{ name: string; address?: string } | null>(null);
  const [inflowInvoiceNumber, setInflowInvoiceNumber] = useState<string | null>(null);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch branch context when on inflows page with branchId
  useEffect(() => {
    const loadBranchContext = async () => {
      if (router.pathname === '/ims/inflows' && router.query.branchId && typeof router.query.branchId === 'string') {
        try {
          const response = await api.get<{ success: boolean; data: any }>(`/settings/branches/${router.query.branchId}`);
          if (response.success && response.data) {
            setBranchContext({
              name: response.data.name || '',
              address: response.data.address,
            });
          }
        } catch (err) {
          console.error('Failed to load branch context:', err);
          setBranchContext(null);
        }
      } else {
        setBranchContext(null);
      }
    };

    loadBranchContext();
  }, [router.pathname, router.query.branchId]);

  // Fetch inflow invoice number when on inflow details page
  useEffect(() => {
    const loadInflowInvoiceNumber = async () => {
      // Check if we're on the inflow details page - check if pathname matches the dynamic route pattern
      const isInflowDetailsPage = router.pathname === '/ims/inflows/[id]' || 
                                  (router.pathname.includes('/ims/inflows/') && router.query.id && !router.query.id.includes('create'));
      
      if (isInflowDetailsPage && router.query.id && typeof router.query.id === 'string') {
        try {
          const response = await api.get<{ success: boolean; data: any }>(`/ims/inflows/${router.query.id}`);
          if (response.success && response.data) {
            setInflowInvoiceNumber(response.data.invoiceNumber || response.data.inflowNumber || response.data.reference || null);
          }
        } catch (err) {
          console.error('Failed to load inflow invoice number:', err);
          setInflowInvoiceNumber(null);
        }
      } else {
        setInflowInvoiceNumber(null);
      }
    };

    loadInflowInvoiceNumber();
  }, [router.pathname, router.query.id]);
  const hasFetchedUserRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const previousUserRef = useRef(user);

  // Reset fetch flag when user logs out
  useEffect(() => {
    if (previousUserRef.current && !user) {
      hasFetchedUserRef.current = false;
      isFetchingRef.current = false;
    }
    previousUserRef.current = user;
  }, [user]);

  useEffect(() => {
    const isAuthPage =
      router.pathname === '/login' ||
      router.pathname === '/register' ||
      router.pathname === '/verify-email' ||
      router.pathname === '/onboarding' ||
      router.pathname === '/auth/callback' ||
      router.pathname === '/invitations/accept' ||
      router.pathname.startsWith('/m/') ||
      router.pathname.startsWith('/site/') ||
      router.pathname.startsWith('/s/') ||
      router.pathname.startsWith('/reserve/') ||
      router.pathname.startsWith('/shop');

    if (isAuthenticated && user) {
      if (!hasFetchedUserRef.current) {
        hasFetchedUserRef.current = true;
        lastFetchTimeRef.current = Date.now();
      }
      return;
    }

    const now = Date.now();
    if (isFetchingRef.current || (now - lastFetchTimeRef.current < 5000 && hasFetchedUserRef.current)) {
      return;
    }

    if (isAuthPage) {
      const token = typeof window !== 'undefined' ? (Cookies.get('auth_token') || null) : null;
      if (!token && isLoading) {
        useAuthStore.setState({ isLoading: false, isAuthenticated: false });
        hasFetchedUserRef.current = true;
        lastFetchTimeRef.current = now;
      } else if (token && !hasFetchedUserRef.current && !user) {
        isFetchingRef.current = true;
        lastFetchTimeRef.current = now;
        fetchUser().finally(() => {
          hasFetchedUserRef.current = true;
          isFetchingRef.current = false;
        });
      }
    } else {
      if (user && isAuthenticated) {
        if (!hasFetchedUserRef.current) {
          hasFetchedUserRef.current = true;
          lastFetchTimeRef.current = now;
        }
        return;
      }
      
      const token = typeof window !== 'undefined' ? (Cookies.get('auth_token') || null) : null;
      
      if (token && !user && !isLoading && !isFetchingRef.current && !hasFetchedUserRef.current) {
        isFetchingRef.current = true;
        lastFetchTimeRef.current = now;
        fetchUser().finally(() => {
          hasFetchedUserRef.current = true;
          isFetchingRef.current = false;
        });
      } else if (!token) {
        hasFetchedUserRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname, isAuthenticated, user]);

  useEffect(() => {
    const handleToggleMobileMenu = () => {
      setMobileMenuOpen((prev) => !prev);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('toggle-mobile-menu', handleToggleMobileMenu);
      return () => {
        window.removeEventListener('toggle-mobile-menu', handleToggleMobileMenu);
      };
    }
    return () => {};
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (mobileMenuOpen) {
        document.body.classList.add('menu-open');
      } else {
        document.body.classList.remove('menu-open');
      }
    }
  }, [mobileMenuOpen]);

  // Persist selected service cookie based on current path
  // Do NOT redirect on refresh - only update cookie to reflect current service
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = router.pathname;
    // Only update cookie, don't redirect
    if (path.startsWith('/hrms')) {
      Cookies.set('service', 'hrms', { expires: 7 });
    } else if (path !== '/login' && path !== '/register' && path !== '/verify-email' && path !== '/onboarding' && path !== '/auth/callback' && !path.startsWith('/m/') && !path.startsWith('/site/') && !path.startsWith('/s/') && !path.startsWith('/reserve/') && !path.startsWith('/shop')) {
      // Only set RMS cookie if not on auth pages
      Cookies.set('service', 'rms', { expires: 7 });
    }
  }, [router.pathname]);

  // Only redirect to login if we're sure user is not authenticated (has checked and no token)
  useEffect(() => {
    const isAuthPage =
      router.pathname === '/login' ||
      router.pathname === '/register' ||
      router.pathname === '/verify-email' ||
      router.pathname === '/onboarding' ||
      router.pathname === '/auth/callback' ||
      router.pathname === '/invitations/accept' ||
      router.pathname.startsWith('/m/') ||
      router.pathname.startsWith('/site/') ||
      router.pathname.startsWith('/s/') ||
      router.pathname.startsWith('/reserve/') ||
      router.pathname.startsWith('/shop');
    if (isAuthPage) return; // Don't redirect if already on auth page

    // Check if we have a token - if yes, wait for auth state to resolve
    const token = typeof window !== 'undefined' ? Cookies.get('auth_token') : null;
    
    // Only redirect if:
    // 1. We've finished loading (isLoading is false)
    // 2. User is definitely not authenticated (isAuthenticated is false)
    // 3. There's no token (meaning user is definitely not logged in)
    // This prevents redirecting during the brief moment when auth is being checked on refresh
    if (!isLoading && !isAuthenticated && !token) {
      router.push('/login');
    }
    // If token exists but isLoading is false and isAuthenticated is false, 
    // we should try to fetch user instead of redirecting
    else if (!isLoading && !isAuthenticated && token && !hasFetchedUserRef.current) {
      // Token exists but user not loaded - try to fetch user
      isFetchingRef.current = true;
      fetchUser().finally(() => {
        isFetchingRef.current = false;
        hasFetchedUserRef.current = true;
      });
    }
  }, [isAuthenticated, isLoading, router, fetchUser]);

  // On auth / pre-session pages, always render children immediately — never the
  // dashboard chrome or the not-authenticated loader. verify-email and onboarding
  // run BEFORE a session exists, so they must be here: otherwise the loader below
  // renders instead of the page, the page's effect never mounts, and (for
  // verify-email) no verification request is ever sent.
  const isAuthPage =
    router.pathname === '/login' ||
    router.pathname === '/register' ||
    router.pathname === '/verify-email' ||
    router.pathname === '/onboarding' ||
    router.pathname === '/auth/callback' ||
    router.pathname === '/invitations/accept' ||
    router.pathname.startsWith('/m/') ||
    router.pathname.startsWith('/site/') ||
    router.pathname.startsWith('/s/') ||
    router.pathname.startsWith('/reserve/') ||
    router.pathname.startsWith('/shop');

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Only show loading spinner on protected pages
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // Not authenticated on a protected page → the redirect effect above is about to
  // send us to /login (or fetch the user for an existing token). Render the loader,
  // NOT the dashboard, so the app never flashes the dashboard chrome first.
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const isHRMS = router.pathname.startsWith('/hrms');
  const inferTitle = () => {
    if (title) return title;
    if (router.pathname === '/') return 'dashboard';
    
    // Check if we're on the order details page
    const isOrderDetailsPage = router.pathname === '/rms/orders/[id]' || 
                                (router.pathname.includes('/rms/orders/') && router.query.id && !router.query.id.includes('create'));
    if (isOrderDetailsPage) {
      return 'salesDetails';
    }
    
    const parts = router.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    const map: Record<string, string> = {
      dashboard: 'dashboard',
      employees: 'employees',
      departments: 'departments',
      locations: 'locations',
      positions: 'positions',
      'leave-types': 'leaveTypes',
      leaves: 'leaves',
      attendance: 'attendance',
      payroll: 'payroll',
      recruitment: 'recruitment',
      performance: 'performance',
      learning: 'learning',
      benefits: 'benefits',
      compensation: 'compensation',
      settings: 'settings',
      menus: 'menus',
      orders: 'orders',
      tables: 'tables',
      inventory: 'inventory',
      inflows: 'inflows',
      'branch-items': 'branchItems',
      profile: 'profile',
      reports: 'analytics',
    };
    const guess = map[last] || last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return map[last] || guess || 'dashboard';
  };
  const inferSubtitle = () => {
    if (subtitle) return subtitle;
    // For dashboard page, use dashboardSubheader
    if (router.pathname === '/' || router.pathname === '/hrms/dashboard') {
      return 'dashboardSubheader';
    }
    // For reports/analytics page
    if (router.pathname === '/rms/reports') {
      return 'analyticsSubheader';
    }
    // For inflow details page - show invoice number
    const isInflowDetailsPage = router.pathname === '/ims/inflows/[id]' || 
                                (router.pathname.includes('/ims/inflows/') && router.query.id && !router.query.id.includes('create'));
    if (isInflowDetailsPage && inflowInvoiceNumber) {
      return inflowInvoiceNumber;
    }
    // For inflows page with branch filter - show branch name
    if (router.pathname === '/ims/inflows' && branchContext) {
      return branchContext.name;
    }
    // Module segment — must match the sidebar section names
    const path = router.pathname;
    if (path.startsWith('/menu-studio')) return 'Menu Studio';
    if (path.startsWith('/rms/suppliers') || path.startsWith('/settings')) return 'Settings';
    if (path.startsWith('/rms')) return 'Restaurant';
    if (path.startsWith('/ims') || path.startsWith('/inventory')) return 'Inventory';
    if (path.startsWith('/sales')) return businessType === 'restaurant' ? 'Money' : 'Sales';
    if (path.startsWith('/accounting')) return businessType === 'restaurant' ? 'Money' : 'Accounting';
    if (path.startsWith('/hrms/departments') || path.startsWith('/hrms/positions') || path.startsWith('/hrms/locations'))
      return 'Settings';
    if (path.startsWith('/hrms')) return 'Human Resources';
    return 'Home';
  };
  const layoutHeader = inferTitle();
  const layoutSubheader = inferSubtitle();

  // SEO/browser-tab title: "Kuza | <Module> - <Page>" (e.g. "Kuza | Restaurant
  // - Reservations"). Module comes from inferTitle(); the page is the last
  // static route segment, humanized. Overrides the default <title>Kuza</title>.
  const documentTitle = (() => {
    const moduleName = (t(layoutHeader) || layoutHeader || '').toString();
    const mod = moduleName === 'Home' ? '' : moduleName;
    if (router.pathname === '/') return 'Kuza | Dashboard';
    const parts = router.pathname.split('/').filter(Boolean);
    let last = parts[parts.length - 1] || '';
    if (last.startsWith('[')) last = parts[parts.length - 2] || '';
    let page = '';
    if (last && !last.startsWith('[')) {
      page = last
        .replace(/-/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    // Drop the page when it's redundant with the module or is just a short
    // route prefix (rms / ims / hr / pos).
    if (page && (page.toLowerCase() === mod.toLowerCase() || page.length <= 3)) page = '';
    const tail = [mod, page].filter(Boolean).join(' - ');
    return tail ? `Kuza | ${tail}` : 'Kuza';
  })();

  // App key the current (blocked) route needs — request the first required key.
  const requestKey = requiredAppKeys(router.pathname)?.[0] ?? null;
  const requestAppName = requestKey ? getApp(requestKey)?.name ?? requestKey : null;

  const handleRequestAccess = async () => {
    if (!requestKey || requestingAccess) return;
    setRequestingAccess(true);
    try {
      await api.post('/billing/access-requests', { appKey: requestKey });
      setAccessRequested(true);
      setToast({ message: 'Request sent to your admin', type: 'success' });
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      // 409 (already requested) / 400 (already have it) — treat as a soft success.
      if (status === 409 || status === 400) {
        setAccessRequested(true);
        setToast({
          message: serverMsg || 'You already have a request for this app',
          type: 'info',
        });
      } else {
        setToast({ message: serverMsg || 'Could not send your request', type: 'error' });
      }
    } finally {
      setRequestingAccess(false);
    }
  };

  // The accent follows the service being rendered: map the current route (and
  // businessType for the selling home) to a vertical accent key consumed by the
  // [data-app="…"] rules in globals.css. Unknown → default (Kuza teal).
  const accentApp = (() => {
    const p = router.pathname;
    if (p.startsWith('/rms') || p.startsWith('/pos') || p.startsWith('/menu')) return 'restaurant';
    if (p.startsWith('/ims') || p.startsWith('/inventory')) return 'inventory';
    if (p.startsWith('/accounting')) return 'accounting';
    if (p.startsWith('/hrms') || p.startsWith('/hr')) return 'hr';
    if (p.startsWith('/payments')) return 'payments';
    if (p === '/') return businessType === 'hospitality' || businessType === 'restaurant' ? 'restaurant' : 'inventory';
    return 'default';
  })();

  return (
    <div className="flex h-dvh md:h-screen overflow-hidden app-container" data-app={accentApp}>
      <Head>
        <title>{documentTitle}</title>
      </Head>
      {/* Desktop Sidebar — collapsible via the header toggle / POS full screen.
          Kept mounted so it slides (animated) instead of snapping in/out. */}
      <AppSidebar collapsed={sidebarCollapsed} />

      {/* Main Content Area - Full Width Minus Sidebar */}
  <div className={`flex-1 flex flex-col min-w-0 h-dvh md:h-screen overflow-hidden main-content-area${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        {/* Top Navigation Header - Fixed */}
        <AppHeader 
          title={t(layoutHeader) || layoutHeader} 
          subtitle={
            inflowInvoiceNumber 
              ? inflowInvoiceNumber 
              : branchContext 
                ? `${branchContext.name}${branchContext.address ? ` • ${branchContext.address}` : ''}` 
                : (t(layoutSubheader) || layoutSubheader)
          } 
        />

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
        )}

        {/* Mobile Sidebar — same navigation as desktop */}
        <div
          className="lg:hidden fixed inset-y-0 left-0 z-50"
          style={{
            width: 'var(--sidebar-width)',
            display: mobileMenuOpen ? 'flex' : 'none',
            transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease-in-out',
          }}
        >
          <AppSidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
        </div>

        {/* Page Content - Scrollable */}
        {/* First-run guide — app-wide so it shows on whichever vertical home a
            new tenant lands on (not just the '/' dashboard). Self-gates via localStorage. */}
        <OnboardingModal />
        <main className="dashboard-main bg-canvas dark:bg-gray-950">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {isPathAllowed(router.pathname, effectiveApps) ? (
              children
            ) : (
              <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-12 text-center mt-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <i className="bx bx-lock-alt text-2xl text-gray-400" aria-hidden="true"></i>
                </span>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">This app isn&apos;t enabled</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This module isn&apos;t part of your current plan or hasn&apos;t been turned on for your business.
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {requestKey && (
                    <button
                      type="button"
                      onClick={handleRequestAccess}
                      disabled={requestingAccess || accessRequested}
                      className="rounded-lg bg-brand-gradient px-4 h-9 inline-flex items-center text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {accessRequested
                        ? 'Request sent'
                        : requestingAccess
                          ? 'Requesting…'
                          : `Request access${requestAppName ? ` to ${requestAppName}` : ''}`}
                    </button>
                  )}
                  <Link
                    href="/settings/apps"
                    className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 h-9 inline-flex items-center text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Browse apps
                  </Link>
                  <Link
                    href="/"
                    className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 h-9 inline-flex items-center text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Go to dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Kuza AI copilot — floating launcher + slide-over, authed pages only */}
      <KuzaCopilot />
    </div>
  );
}
