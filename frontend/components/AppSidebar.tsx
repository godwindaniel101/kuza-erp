import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import PermissionGuard from './PermissionGuard';
import { useTranslation } from 'next-i18next';
import NavItem from './NavItem';
import { api } from '@/lib/api';

export default function AppSidebar() {
  const router = useRouter();
  const { pathname, locale } = router;
  const { t, i18n } = useTranslation('common');
  const { user } = useAuthStore();
  const [inventoryOpen, setInventoryOpen] = useState(
    pathname.startsWith('/ims') || pathname.startsWith('/inventory')
  );
  const [appSettingsOpen, setAppSettingsOpen] = useState(
    pathname.startsWith('/rms/suppliers') ||
    pathname.startsWith('/settings/branches') || 
    pathname.startsWith('/settings/uoms') || 
    pathname.startsWith('/settings/categories') ||
    pathname.startsWith('/settings/allocation-method') || 
    pathname.startsWith('/settings/users') || 
    pathname.startsWith('/settings/roles') || 
    pathname.startsWith('/settings/invitations') ||
    pathname.startsWith('/hrms/departments') ||
    pathname.startsWith('/hrms/positions') ||
    pathname.startsWith('/hrms/locations')
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);

  const isActive = (path: string) => pathname.startsWith(path);
  const isExactActive = (path: string) => pathname === path;

  // Determine service context (RMS or HRMS)
  const isHRMS = pathname.startsWith('/hrms');
  const serviceColor = isHRMS ? 'blue' : 'red';
  const serviceName = isHRMS ? 'HRMS' : 'RMS';

  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
    };
    checkDarkMode();
    // Listen for dark mode changes
    if (typeof window !== 'undefined') {
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      // Also listen for storage events (if dark mode is changed elsewhere)
      window.addEventListener('storage', checkDarkMode);
      return () => {
        observer.disconnect();
        window.removeEventListener('storage', checkDarkMode);
      };
    }
  }, []);

  // Determine logo path - use icon-only logo since we display business name separately
  const getLogoPath = () => {
    const color = serviceColor; // 'red' or 'blue'
    const mode = isDarkMode ? 'dark' : 'light';
    return `/images/logos/kuza_logo_${mode}_${color}.svg`;
  };

  // Update open states when pathname changes
  useEffect(() => {
    setInventoryOpen(pathname.startsWith('/ims') || pathname.startsWith('/inventory'));
    setAppSettingsOpen(
      pathname.startsWith('/rms/suppliers') ||
      pathname.startsWith('/settings/branches') || 
      pathname.startsWith('/settings/uoms') || 
      pathname.startsWith('/settings/users') ||
      pathname.startsWith('/settings/allocation-method') || 
      pathname.startsWith('/settings/roles') || 
      pathname.startsWith('/settings/invitations') ||
      pathname.startsWith('/hrms/departments') ||
      pathname.startsWith('/hrms/positions') ||
      pathname.startsWith('/hrms/locations')
    );
  }, [pathname]); 

  // Force re-render when locale changes
  useEffect(() => {
    // This effect will trigger when locale changes, causing component to re-render
  }, [locale, i18n.language]);

  // Fetch restaurant name
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

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Logo Section - Fixed at Top */}
      <div className="p-6 pb-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
        <Link href={isHRMS ? '/hrms/dashboard' : '/'} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="relative w-12 h-12 flex-shrink-0">
            <Image
              src={getLogoPath()}
              alt={serviceColor === 'red' ? 'Kuza RMS' : 'Kuza HRMS'}
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
          {restaurantName && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {restaurantName}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{serviceName}</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {/* Dashboard */}
        <NavItem
          href={isHRMS ? '/hrms/dashboard' : '/'}
          active={isExactActive(isHRMS ? '/hrms/dashboard' : '/')}
          icon="bx-home"
        >
          {t('dashboard')}
        </NavItem>

        {/* RMS Routes */}
        {!isHRMS && (
          <>
            <PermissionGuard permission="menus.view">
              <NavItem
                href="/rms/menus"
                active={isActive('/rms/menus')}
                icon="bx-food-menu"
              >
                {t('menuManagement') || 'Menu Management'}
              </NavItem>
            </PermissionGuard>

            {/* Inventory - Collapsible */}
            <PermissionGuard permission="inventory.view">
              <div>
                <div className="flex items-center justify-between">
                  <Link
                    href="/ims/inventory"
                    className={`flex-1 flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive('/ims') || isActive('/inventory')
                        ? 'bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <i className="bx bx-package text-xl"></i>
                    <span className="font-medium">{t('inventory')}</span>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInventoryOpen(!inventoryOpen);
                    }}
                    className={`px-2 py-3 rounded-lg transition-colors ${
                      isActive('/ims') || isActive('/inventory')
                        ? 'bg-red-50 dark:bg-red-900/20 text-gray-700 dark:text-gray-300'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <i className={`bx text-lg transition-transform ${inventoryOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}></i>
                  </button>
                </div>
                {inventoryOpen && (
                  <div
                    className="mt-1 ml-4 space-y-1"
                    style={{ display: inventoryOpen ? 'block' : 'none' }}
                  >
                    <Link
                      href="/ims/inventory"
                      key={`inventory-link-${locale || i18n.language}`}
                      className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                        isActive('/ims/inventory') || isActive('/inventory')
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <i className="bx bx-list-ul text-lg"></i>
                      <span className="text-sm">{t('invetoryItems')}</span>
                    </Link>
                    <PermissionGuard permission="inflows.view">
                      <Link
                        href="/ims/inflows"
                        key={`inflow-link-${locale || i18n.language}`}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/ims/inflows')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-box text-lg"></i>
                        <span className="text-sm">{t('inventoryInflow')}</span>
                      </Link>
                    </PermissionGuard>
                    <Link
                      href="/ims/branch-items"
                      className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                        isActive('/ims/branch-items')
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <i className="bx bx-package text-lg"></i>
                      <span className="text-sm">{t('branchItems') || 'Branch Items'}</span>
                    </Link>
                  </div>
                )}
              </div>
            </PermissionGuard>

            <PermissionGuard permission="orders.view">
              <NavItem
                href="/rms/orders"
                active={isActive('/rms/orders')}
                icon="bx-receipt"
              >
                {t('orders')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="tables.view">
              <NavItem
                href="/rms/tables"
                active={isActive('/rms/tables')}
                icon="bx-table"
              >
                {t('tables')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="reports.view">
              <NavItem
                href="/rms/reports"
                active={isActive('/rms/reports')}
                icon="bx-stats"
              >
                {t('analytics')}
              </NavItem>
            </PermissionGuard>

            {/* App Settings - Collapsible (RMS: Suppliers, Branches, UOMs, Categories, Users, Roles) */}
            <PermissionGuard permissions={['suppliers.view', 'branches.view', 'uoms.view', 'inventory.view', 'users.view', 'roles.view']}>
              <div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setAppSettingsOpen(!appSettingsOpen)}
                    className={`flex-1 flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive('/rms/suppliers') || isActive('/settings/branches') || isActive('/settings/uoms') || isActive('/settings/categories') || isActive('/settings/users') || isActive('/settings/roles') || isActive('/settings/invitations') || isActive('/settings/allocation-method')
                        ? 'bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <i className="bx bx-cog text-xl"></i>
                    <span className="font-medium">{t('appSettings') || 'App Settings'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppSettingsOpen(!appSettingsOpen)}
                    className={`px-2 py-3 rounded-lg transition-colors ${
                      isActive('/rms/suppliers') || isActive('/settings/branches') || isActive('/settings/uoms') || isActive('/settings/categories') || isActive('/settings/users') || isActive('/settings/roles') || isActive('/settings/invitations') || isActive('/settings/allocation-method')
                        ? 'bg-red-50 dark:bg-red-900/20 text-gray-700 dark:text-gray-300'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <i className={`bx text-lg transition-transform ${appSettingsOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}></i>
                  </button>
                </div>
                {appSettingsOpen && (
                  <div
                    className="mt-1 ml-4 space-y-1"
                    style={{ display: appSettingsOpen ? 'block' : 'none' }}
                  >
                    <PermissionGuard permission="suppliers.view">
                      <Link
                        href="/rms/suppliers"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/rms/suppliers')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-bus text-lg"></i>
                        <span className="text-sm">{t('suppliers')}</span>
                      </Link>
                    </PermissionGuard>
                    <PermissionGuard permission="branches.view">
                      <Link
                        href="/settings/branches"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/settings/branches')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-git-branch text-lg"></i>
                        <span className="text-sm">{t('branch')}</span>
                      </Link>
                    </PermissionGuard>
                    <PermissionGuard permission="uoms.view">
                      <Link
                        href="/settings/uoms"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/settings/uoms')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-ruler text-lg"></i>
                        <span className="text-sm">{t('uoms')}</span>
                      </Link>
                    </PermissionGuard>
                    <PermissionGuard permission="inventory.view">
                      <Link
                        href="/settings/categories"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/settings/categories')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-folder text-lg"></i>
                        <span className="text-sm">{t('categories')}</span>
                      </Link>
                    </PermissionGuard>
                    <PermissionGuard permission="settings.view">
                      <Link
                        href="/settings/allocation-method"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/settings/allocation-method')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-sort text-lg"></i>
                        <span className="text-sm">{t('allocationMethod')}</span>
                      </Link>
                    </PermissionGuard>
                    <PermissionGuard permission="users.view">
                      <Link
                        href="/settings/users"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/settings/users') || isActive('/settings/invitations')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-user text-lg"></i>
                        <span className="text-sm">{t('users')}</span>
                      </Link>
                    </PermissionGuard>
                    <PermissionGuard permission="roles.view">
                      <Link
                        href="/settings/roles"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/settings/roles')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-group text-lg"></i>
                        <span className="text-sm">{t('roles')}</span>
                      </Link>
                    </PermissionGuard>
                    <PermissionGuard permission="invitations.view">
                      <Link
                        href="/settings/invitations"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/settings/invitations')
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-envelope text-lg"></i>
                        <span className="text-sm">{t('invitations')}</span>
                      </Link>
                    </PermissionGuard>
                  </div>
                )}
              </div>
            </PermissionGuard>
          </>
        )}

        {/* HRMS Routes */}
        {isHRMS && (
          <>
            <PermissionGuard permission="employees.view">
              <NavItem
                href="/hrms/employees"
                active={isActive('/hrms/employees')}
                icon="bx-user"
              >
                {t('employees')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="attendance.view">
              <NavItem
                href="/hrms/attendance"
                active={isActive('/hrms/attendance')}
                icon="bx-time"
              >
                {t('attendance')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="leaves.view">
              <NavItem
                href="/hrms/leaves"
                active={isActive('/hrms/leaves')}
                icon="bx-calendar"
              >
                {t('leaves')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="payroll.view">
              <NavItem
                href="/hrms/payroll"
                active={isActive('/hrms/payroll')}
                icon="bx-money"
              >
                {t('payroll')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="recruitment.view">
              <NavItem
                href="/hrms/recruitment"
                active={isActive('/hrms/recruitment')}
                icon="bx-briefcase"
              >
                {t('recruitment')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="performance.view">
              <NavItem
                href="/hrms/performance"
                active={isActive('/hrms/performance')}
                icon="bx-trophy"
              >
                {t('performance')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="learning.view">
              <NavItem
                href="/hrms/learning"
                active={isActive('/hrms/learning')}
                icon="bx-book"
              >
                {t('learning')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="benefits.view">
              <NavItem
                href="/hrms/benefits"
                active={isActive('/hrms/benefits')}
                icon="bx-heart"
              >
                {t('benefits')}
              </NavItem>
            </PermissionGuard>

            <PermissionGuard permission="compensation.view">
              <NavItem
                href="/hrms/compensation"
                active={isActive('/hrms/compensation')}
                icon="bx-wallet"
              >
                {t('compensation')}
              </NavItem>
            </PermissionGuard>

            {/* App Settings - Collapsible (HRMS: Departments, Positions, Locations) */}
            <PermissionGuard permissions={['departments.view', 'positions.view', 'locations.view']}>
              <div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setAppSettingsOpen(!appSettingsOpen)}
                    className={`flex-1 flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive('/hrms/departments') || isActive('/hrms/positions') || isActive('/hrms/locations')
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <i className="bx bx-cog text-xl"></i>
                    <span className="font-medium">{t('appSettings') || 'App Settings'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppSettingsOpen(!appSettingsOpen)}
                    className={`px-2 py-3 rounded-lg transition-colors ${
                      isActive('/hrms/departments') || isActive('/hrms/positions') || isActive('/hrms/locations')
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <i className={`bx text-lg transition-transform ${appSettingsOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}></i>
                  </button>
                </div>
                {appSettingsOpen && (
                  <div
                    className="mt-1 ml-4 space-y-1"
                    style={{ display: appSettingsOpen ? 'block' : 'none' }}
                  >
                    <PermissionGuard permission="departments.view">
                      <Link
                        href="/hrms/departments"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/hrms/departments')
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-buildings text-lg"></i>
                        <span className="text-sm">{t('departments')}</span>
                      </Link>
                    </PermissionGuard>
                    <PermissionGuard permission="positions.view">
                      <Link
                        href="/hrms/positions"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/hrms/positions')
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-briefcase text-lg"></i>
                        <span className="text-sm">{t('positions')}</span>
                      </Link>
                    </PermissionGuard>
                    <PermissionGuard permission="locations.view">
                      <Link
                        href="/hrms/locations"
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                          isActive('/hrms/locations')
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <i className="bx bx-map text-lg"></i>
                        <span className="text-sm">{t('locations')}</span>
                      </Link>
                    </PermissionGuard>
                  </div>
                )}
              </div>
            </PermissionGuard>
          </>
        )}
      </nav>

      {/* User Profile - Fixed at Bottom */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative">
          <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center space-x-3 w-full">
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                serviceColor === 'red' ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600'
              } flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0`}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.businessId ? 'Restaurant' : user?.email || 'User'}
              </p>
            </div>
            <i className={`bx bx-chevron-down text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform ${profileOpen ? 'transform rotate-180' : ''}`}></i>
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
              style={{ display: profileOpen ? 'block' : 'none' }}
            >
              <Link
                href="/profile"
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => setProfileOpen(false)}
              >
                <i className="bx bx-user mr-3 text-lg"></i> {t('profile')}
              </Link>
              <Link
                href={isHRMS ? '/hrms/settings' : '/settings'}
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => setProfileOpen(false)}
              >
                <i className="bx bx-cog mr-3 text-lg"></i> {t('settings')}
              </Link>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                onClick={() => {
                  const { logout } = useAuthStore.getState();
                  logout();
                  router.push('/login');
                }}
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
    </aside>
  );
}
