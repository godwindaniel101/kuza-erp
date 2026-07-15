import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/globalStore';
import PermissionGuard from './PermissionGuard';
import { useTranslation } from 'next-i18next';
import NavItem from './NavItem';
import Icon, { IconName } from './ui/Icon';
import { term } from '@/lib/terminology';

/**
 * App-isolated sidebar (Odoo-style). The product is a set of APPS. You are
 * always inside exactly ONE app, determined by the current route. The sidebar
 * shows only that app's navigation, landing on that app's own dashboard. An
 * app launcher (grid button in the header) switches between apps.
 *
 * This replaces the old flat catalog where every module rendered at once and
 * "Home" always meant the restaurant/IMS dashboard regardless of context.
 */

interface NavLeaf {
  href: string;
  label: string;
  icon: IconName;
  permission?: string;
  /** Match exactly instead of by prefix. */
  exact?: boolean;
  /** Extra prefixes that should also count as active. */
  also?: string[];
  /** Prefixes that must NOT count as active (carve-outs from the prefix match). */
  exclude?: string[];
}

interface NavGroup {
  /** Group heading (omit for the top, ungrouped items like the dashboard). */
  label?: string;
  items: NavLeaf[];
}

interface AppDef {
  id: string;
  name: string;
  icon: IconName;
  /** One-line description shown in the launcher. */
  blurb: string;
  /** Landing route for this app (its dashboard). */
  home: string;
  /** Plan-module keys this app maps to (any-of). Absent = always available. */
  moduleKeys?: string[];
  /** effective-apps registry keys that enable this app (any-of). Absent = not app-gated. */
  appKeys?: string[];
  groups: NavGroup[];
}

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

/** Plan-module vocabulary is fuzzy across backends — match by alias substring. */
const MODULE_ALIASES: Record<string, string[]> = {
  rms: ['rms', 'restaurant', 'hospitality', 'menu', 'order', 'table', 'pos'],
  ims: ['ims', 'inventory', 'stock'],
  sales: ['sales', 'invoice', 'customer'],
  accounting: ['accounting', 'finance', 'ledger'],
  hrms: ['hrms', 'hr', 'people', 'payroll'],
};

const EDITION_CHIPS: Record<string, string> = {
  hospitality: 'Hospitality',
  restaurant: 'Hospitality',
  accounts: 'Digital Accounts',
  retail: 'Retail',
  hr: 'Human Resources',
  warehouse: 'Warehouse',
};

export default function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const router = useRouter();
  const { pathname } = router;
  const { t } = useTranslation('common');
  const { user } = useAuthStore();
  const {
    businessType,
    businessName,
    planModules,
    planCode,
    subscriptionStatus,
    effectiveApps,
    fetchTenantContext,
  } = useTenantStore();

  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return !v || v === key ? fallback : v;
  };

  const [profileOpen, setProfileOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchTenantContext();
  }, [user, fetchTenantContext]);

  // Close launcher on outside click / Escape.
  useEffect(() => {
    if (!launcherOpen) return;
    const onClick = (e: MouseEvent) => {
      if (launcherRef.current && !launcherRef.current.contains(e.target as Node)) setLauncherOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLauncherOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [launcherOpen]);

  // ---- App catalog -----------------------------------------------------

  const apps: AppDef[] = [
    {
      id: 'pos',
      name: term(businessType, 'posSection') || 'Point of Sale',
      icon: 'building-storefront',
      blurb: 'Ring up sales, manage orders, tables and menus',
      home: '/',
      moduleKeys: ['rms'],
      appKeys: ['pos', 'tables', 'menu'],
      groups: [
        { items: [{ href: '/', label: tr('dashboard', 'Dashboard'), icon: 'home', exact: true }] },
        {
          label: 'Sell',
          items: [
            // One entry: the sales hub (list + a New Sale button that opens /pos).
            // 'Sales' for retail, 'Orders' for restaurant (dine-in tickets).
            { href: '/rms/orders', label: term(businessType, 'sellNav') || 'Sales', icon: 'receipt', permission: 'orders.view', also: ['/pos'], exclude: ['/rms/orders/create'] },
            { href: '/rms/tables', label: tr('tables', 'Tables'), icon: 'table-cells', permission: 'tables.view' },
          ],
        },
        {
          label: 'Menu',
          items: [
            { href: '/rms/menus', label: 'Menus', icon: 'menu-book', permission: 'menus.view' },
            { href: '/menu-studio', label: 'QR Menu', icon: 'sparkles' },
          ],
        },
        {
          label: 'Insights',
          items: [{ href: '/rms/reports', label: tr('analytics', 'Analytics'), icon: 'chart-bar', permission: 'reports.view' }],
        },
      ],
    },
    {
      id: 'inventory',
      name: term(businessType, 'inventorySection') || 'Inventory',
      icon: 'cube',
      blurb: 'Track stock, receive goods and value your inventory',
      home: '/ims',
      moduleKeys: ['ims'],
      appKeys: ['items', 'goods-in'],
      groups: [
        { items: [{ href: '/ims', label: tr('dashboard', 'Dashboard'), icon: 'home', exact: true }] },
        {
          label: 'Stock',
          items: [
            { href: '/ims/inventory', label: 'Stock Items', icon: 'cube', permission: 'inventory.view', also: ['/inventory'] },
            { href: '/ims/inflows', label: 'Receive Stock', icon: 'inbox-arrow', permission: 'inflows.view' },
            { href: '/ims/branch-items', label: 'Branch Stock', icon: 'building-storefront' },
            { href: '/ims/transfers', label: tr('transfers', 'Transfers'), icon: 'arrows-right-left' },
            { href: '/ims/adjustments', label: tr('adjustments', 'Adjustments'), icon: 'adjustments' },
            { href: '/ims/stock-movements', label: tr('stockLedger', 'Stock Ledger'), icon: 'arrows-right-left' },
          ],
        },
        {
          label: 'Purchasing',
          items: [{ href: '/rms/suppliers', label: tr('suppliers', 'Suppliers'), icon: 'truck', permission: 'suppliers.view' }],
        },
        {
          label: 'Setup',
          items: [
            { href: '/settings/categories', label: tr('categories', 'Categories'), icon: 'folder', permission: 'inventory.view' },
            { href: '/settings/uoms', label: tr('uoms', 'Units of Measure'), icon: 'scale', permission: 'uoms.view' },
            { href: '/settings/allocation-method', label: tr('allocationMethod', 'Allocation Method'), icon: 'adjustments', permission: 'settings.view' },
          ],
        },
      ],
    },
    {
      id: 'sales',
      name: 'Sales',
      icon: 'banknotes',
      blurb: 'Customers, invoices and getting paid',
      home: '/sales',
      moduleKeys: ['sales'],
      appKeys: ['customers', 'invoicing'],
      groups: [
        { items: [{ href: '/sales', label: tr('dashboard', 'Dashboard'), icon: 'home', exact: true }] },
        {
          items: [
            { href: '/sales/customers', label: tr('customers', 'Customers'), icon: 'users', permission: 'sales.view' },
            { href: '/sales/invoices', label: tr('invoices', 'Invoices'), icon: 'document-text', permission: 'sales.view' },
          ],
        },
      ],
    },
    {
      id: 'accounting',
      name: 'Accounting',
      icon: 'calculator',
      blurb: 'Double-entry books, ledger and financial reports',
      home: '/accounting',
      moduleKeys: ['accounting'],
      appKeys: ['books'],
      groups: [
        {
          items: [
            { href: '/accounting', label: 'Overview', icon: 'home', exact: true },
            { href: '/accounting/chart-of-accounts', label: tr('chartOfAccounts', 'Chart of Accounts'), icon: 'book-open' },
            { href: '/accounting/journal-entries', label: tr('journalEntries', 'Journal Entries'), icon: 'pencil-square' },
            { href: '/accounting/reports', label: tr('reports', 'Reports'), icon: 'chart-bar' },
          ],
        },
      ],
    },
    {
      id: 'hr',
      name: 'People',
      icon: 'users',
      blurb: 'Employees, attendance, leave and payroll',
      home: '/hrms/dashboard',
      moduleKeys: ['hrms'],
      appKeys: ['people', 'payroll'],
      groups: [
        { items: [{ href: '/hrms/dashboard', label: tr('dashboard', 'Dashboard'), icon: 'home', exact: true }] },
        {
          label: 'People',
          items: [
            { href: '/hrms/employees', label: tr('employees', 'Employees'), icon: 'users', permission: 'employees.view' },
            { href: '/hrms/attendance', label: tr('attendance', 'Attendance'), icon: 'clock', permission: 'attendance.view' },
            { href: '/hrms/leaves', label: tr('leaves', 'Leaves'), icon: 'calendar', permission: 'leaves.view' },
            { href: '/hrms/payroll', label: tr('payroll', 'Payroll'), icon: 'banknotes', permission: 'payroll.view' },
          ],
        },
        {
          label: 'Talent',
          items: [
            { href: '/hrms/recruitment', label: tr('recruitment', 'Recruitment'), icon: 'briefcase', permission: 'recruitment.view' },
            { href: '/hrms/performance', label: tr('performance', 'Performance'), icon: 'star', permission: 'performance.view' },
            { href: '/hrms/learning', label: tr('learning', 'Learning'), icon: 'academic-cap', permission: 'learning.view' },
          ],
        },
        {
          label: 'Rewards',
          items: [
            { href: '/hrms/benefits', label: tr('benefits', 'Benefits'), icon: 'heart', permission: 'benefits.view' },
            { href: '/hrms/compensation', label: tr('compensation', 'Compensation'), icon: 'wallet', permission: 'compensation.view' },
          ],
        },
        {
          label: 'Setup',
          items: [
            { href: '/hrms/departments', label: tr('departments', 'Departments'), icon: 'building-office', permission: 'departments.view' },
            { href: '/hrms/positions', label: tr('positions', 'Positions'), icon: 'briefcase', permission: 'positions.view' },
            { href: '/hrms/locations', label: tr('locations', 'Locations'), icon: 'map-pin', permission: 'locations.view' },
          ],
        },
      ],
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: 'cog',
      blurb: 'Users, roles, branches and billing',
      home: '/settings',
      groups: [
        {
          items: [
            { href: '/settings', label: 'General', icon: 'cog', exact: true },
            { href: '/settings/branches', label: tr('branch', 'Branches'), icon: 'git-branch', permission: 'branches.view' },
            { href: '/settings/users', label: tr('users', 'Users'), icon: 'user', permission: 'users.view' },
            { href: '/settings/roles', label: tr('roles', 'Roles'), icon: 'shield', permission: 'roles.view' },
            { href: '/settings/invitations', label: tr('invitations', 'Invitations'), icon: 'envelope', permission: 'invitations.view' },
            { href: '/settings/apps', label: tr('apps', 'Apps'), icon: 'squares-2x2', permission: 'settings.view' },
            { href: '/settings/billing', label: tr('billing', 'Billing'), icon: 'credit-card', permission: 'settings.view' },
          ],
        },
      ],
    },
  ];

  // ---- App availability (plan / effective-apps gating) -----------------

  const hasModule = useCallback(
    (keys?: string[]) => {
      if (!keys || keys.length === 0) return true;
      if (!planModules) return true; // unknown -> never hide
      return keys.some((key) => {
        const aliases = MODULE_ALIASES[key] ?? [key];
        return planModules.some((m) => aliases.some((a) => m.includes(a) || a.includes(m)));
      });
    },
    [planModules],
  );

  const isAppAvailable = useCallback(
    (app: AppDef) => {
      if (app.id === 'settings') return true; // system app always available
      if (effectiveApps && app.appKeys) {
        return app.appKeys.some((k) => effectiveApps.includes(k));
      }
      return hasModule(app.moduleKeys);
    },
    [effectiveApps, hasModule],
  );

  const availableApps = apps.filter(isAppAvailable);
  // Settings is always reachable via the launcher, but only listed among the
  // "business apps" grid separately.
  const businessApps = availableApps.filter((a) => a.id !== 'settings');

  // ---- Which app am I in? (route-driven) -------------------------------

  const appForPath = useCallback(
    (path: string): AppDef => {
      // System-settings subpaths that belong to a *module* app, not Settings.
      const inventorySetup = ['/settings/categories', '/settings/uoms', '/settings/allocation-method'];
      if (inventorySetup.some((p) => path.startsWith(p))) return apps.find((a) => a.id === 'inventory')!;

      if (path.startsWith('/hrms')) return apps.find((a) => a.id === 'hr')!;
      if (path.startsWith('/ims') || path.startsWith('/inventory')) return apps.find((a) => a.id === 'inventory')!;
      if (path.startsWith('/sales')) return apps.find((a) => a.id === 'sales')!;
      if (path.startsWith('/accounting')) return apps.find((a) => a.id === 'accounting')!;
      if (path.startsWith('/settings')) return apps.find((a) => a.id === 'settings')!;
      if (path.startsWith('/rms/suppliers')) return apps.find((a) => a.id === 'inventory')!;
      if (
        path === '/' ||
        path.startsWith('/rms') ||
        path.startsWith('/pos') ||
        path.startsWith('/menu-studio')
      )
        return apps.find((a) => a.id === 'pos')!;
      // Fallback: first available business app, else settings.
      return businessApps[0] ?? apps.find((a) => a.id === 'settings')!;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businessApps.length],
  );

  const activeApp = appForPath(pathname);

  const isItemActive = useCallback(
    (item: NavLeaf) => {
      if ((item.exclude ?? []).some((p) => pathname.startsWith(p))) return false;
      if (item.exact) return pathname === item.href;
      if (pathname.startsWith(item.href)) return true;
      return (item.also ?? []).some((p) => pathname.startsWith(p));
    },
    [pathname],
  );

  // ---- Render ----------------------------------------------------------

  const renderItem = (item: NavLeaf) => {
    const link = (
      <NavItem href={item.href} icon={item.icon} active={isItemActive(item)} onClick={onNavigate}>
        {item.label}
      </NavItem>
    );
    return item.permission ? (
      <PermissionGuard key={item.href} permission={item.permission}>
        {link}
      </PermissionGuard>
    ) : (
      <div key={item.href}>{link}</div>
    );
  };

  const renderGroup = (group: NavGroup, idx: number) => (
    <div key={group.label ?? `g${idx}`} className={group.label ? 'mt-5' : ''}>
      {group.label && (
        <p className="px-3 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {group.label}
        </p>
      )}
      <div className="space-y-px">{group.items.map(renderItem)}</div>
    </div>
  );

  const userRole = user?.roles?.[0]
    ? user.roles[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : user?.email || '';

  return (
    <aside
      className={`${
        mobile ? 'flex h-full w-full' : 'hidden lg:flex fixed left-0 top-0 h-full z-30'
      } flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800`}
      style={mobile ? undefined : { width: 'var(--sidebar-width)' }}
    >
      {/* App switcher header — current app + launcher */}
      <div className="relative shrink-0 px-2 pt-2.5 pb-2" ref={launcherRef}>
        <button
          type="button"
          onClick={() => setLauncherOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={launcherOpen}
          className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
            <Icon name={activeApp.icon} size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {activeApp.name}
            </span>
            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
              {businessName || 'Kuza'}
              {EDITION_CHIPS[businessType ?? ''] ? ` · ${EDITION_CHIPS[businessType ?? '']}` : ''}
            </span>
          </span>
          <Icon name="squares-2x2" size={16} className="text-gray-400 dark:text-gray-500" />
        </button>

        {launcherOpen && (
          <div
            role="menu"
            className="absolute left-2 right-2 top-full z-50 mt-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-popover"
          >
            <p className="px-2 pb-1.5 pt-1 text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Apps
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {businessApps.map((app) => (
                <Link
                  key={app.id}
                  href={app.home}
                  role="menuitem"
                  onClick={() => {
                    setLauncherOpen(false);
                    onNavigate?.();
                  }}
                  className={`flex flex-col items-start gap-1.5 rounded-xl border p-2.5 transition-colors duration-150 ${
                    app.id === activeApp.id
                      ? 'border-brand-200 bg-brand-50/70 dark:border-brand-500/30 dark:bg-brand-500/10'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/70'
                  }`}
                  title={app.blurb}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white">
                    <Icon name={app.icon} size={15} />
                  </span>
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{app.name}</span>
                </Link>
              ))}
            </div>
            <div className="my-1.5 border-t border-gray-200 dark:border-gray-800" />
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => {
                setLauncherOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70"
            >
              <Icon name="cog" size={16} className="text-gray-400 dark:text-gray-500" />
              Settings
            </Link>
          </div>
        )}
      </div>

      {/* Active app navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3">
        {activeApp.groups.map(renderGroup)}
      </nav>

      {/* Upgrade promo — FREE / TRIALING only */}
      {(planCode === 'FREE' || subscriptionStatus === 'TRIALING') && (
        <div className="shrink-0 px-2 pb-2">
          <div className="rounded-2xl bg-brand-50/80 dark:bg-brand-500/10 ring-1 ring-brand-100 dark:ring-brand-500/20 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
                <Icon name="sparkles" size={13} />
              </span>
              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Upgrade plan</p>
            </div>
            <p className="mt-1.5 text-xs leading-4 text-gray-500 dark:text-gray-400">Unlock your full business</p>
            <Link
              href="/settings/billing"
              onClick={onNavigate}
              className="mt-2.5 flex h-8 w-full items-center justify-center rounded-lg bg-brand-gradient text-xs font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Upgrade now
            </Link>
          </div>
        </div>
      )}

      {/* User block */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 p-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.name || 'User'}
              </span>
              <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{userRole}</span>
            </span>
            <Icon
              name="chevron-down"
              size={14}
              className={`text-gray-400 dark:text-gray-500 transition-transform duration-150 ${
                profileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 right-0 z-50 mb-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1.5 shadow-popover"
            >
              <Link
                href="/profile"
                role="menuitem"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                onClick={() => {
                  setProfileOpen(false);
                  onNavigate?.();
                }}
              >
                <Icon name="user" size={16} className="text-gray-400 dark:text-gray-500" />
                {t('profile')}
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-gray-700 dark:text-gray-300 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                onClick={() => {
                  setProfileOpen(false);
                  onNavigate?.();
                }}
              >
                <Icon name="cog" size={16} className="text-gray-400 dark:text-gray-500" />
                {t('settings')}
              </Link>
              <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const { logout } = useAuthStore.getState();
                  logout();
                  router.push('/login');
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-red-600 dark:text-red-400 transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Icon name="logout" size={16} />
                {t('signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
