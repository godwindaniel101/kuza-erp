import { ReactNode, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { useAuthStore } from '@/store/authStore';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function Layout({ children, title, subtitle }: LayoutProps) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { isAuthenticated, isLoading, fetchUser, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [branchContext, setBranchContext] = useState<{ name: string; address?: string } | null>(null);
  const [inflowInvoiceNumber, setInflowInvoiceNumber] = useState<string | null>(null);
  
  // Detect dark mode for mobile sidebar logo
  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
    };
    checkDarkMode();
    if (typeof window !== 'undefined') {
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      return () => observer.disconnect();
    }
  }, []);

  // Fetch restaurant name for mobile sidebar
  useEffect(() => {
    const fetchRestaurantName = async () => {
      try {
        const response = await api.get<{ success: boolean; data: { name?: string } }>('/settings');
        if (response.success && response.data?.name) {
          setRestaurantName(response.data.name);
        }
      } catch (err) {
        console.error('Failed to fetch restaurant name:', err);
        // Silently fail - don't show error to user
      }
    };

    if (user?.businessId) {
      fetchRestaurantName();
    }
  }, [user?.businessId]);

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
    const isAuthPage = router.pathname === '/login' || router.pathname === '/register' || router.pathname === '/auth/callback';
    
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
    } else if (path !== '/login' && path !== '/register' && path !== '/auth/callback') {
      // Only set RMS cookie if not on auth pages
      Cookies.set('service', 'rms', { expires: 7 });
    }
  }, [router.pathname]);

  // Only redirect to login if we're sure user is not authenticated (has checked and no token)
  useEffect(() => {
    const isAuthPage = router.pathname === '/login' || router.pathname === '/register' || router.pathname === '/auth/callback';
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

  // On auth pages, always show children immediately
  const isAuthPage = router.pathname === '/login' || router.pathname === '/register' || router.pathname === '/auth/callback';
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Only show loading spinner on protected pages
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
    return isHRMS ? 'humanResources' : 'restaurantManagement';
  };
  const layoutHeader = inferTitle();
  const layoutSubheader = inferSubtitle();

  return (
    <div className="flex h-dvh md:h-screen overflow-hidden app-container">
      {/* Desktop Sidebar */}
      <AppSidebar />

      {/* Main Content Area - Full Width Minus Sidebar */}
  <div className="flex-1 flex flex-col min-w-0 h-dvh md:h-screen overflow-hidden main-content-area">
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
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMobileMenuOpen(false)}
            style={{ display: mobileMenuOpen ? 'block' : 'none' }}
          ></div>
        )}

        {/* Mobile Sidebar */}
        <div
          className={`lg:hidden fixed inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 flex flex-col`}
          style={{
            width: 'var(--sidebar-width)',
            display: mobileMenuOpen ? 'flex' : 'none',
            transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease-in-out',
          }}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <Link href={isHRMS ? '/hrms/dashboard' : '/'} className="flex items-center space-x-3 hover:opacity-80 transition-opacity flex-1 min-w-0">
                {(() => {
                  const color = isHRMS ? 'blue' : 'red';
                  const mode = isDarkMode ? 'dark' : 'light';
                  const logoPath = `/images/logos/kuza_logo_${mode}_${color}.svg`;
                  return (
                    <>
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <Image
                          src={logoPath}
                          alt={isHRMS ? 'Kuza HRMS' : 'Kuza RMS'}
                          width={40}
                          height={40}
                          className="object-contain"
                          priority
                        />
                      </div>
                      {restaurantName && (
                        <div className="flex-1 min-w-0">
                          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {restaurantName}
                          </h1>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{isHRMS ? 'HRMS' : 'RMS'}</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <i className="bx bx-x text-2xl"></i>
              </button>
            </div>
          </div>

          {/* Mobile Navigation - Full navigation matching desktop */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <Link
              href={isHRMS ? '/hrms/dashboard' : '/'}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <i className="bx bx-home text-xl"></i>
              <span className="font-medium">{t('dashboard')}</span>
            </Link>
            {/* More mobile nav items would go here - matching desktop structure */}
          </nav>
        </div>

        {/* Page Content - Scrollable */}
  <main className="dashboard-main bg-gray-50 dark:bg-gray-900">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
