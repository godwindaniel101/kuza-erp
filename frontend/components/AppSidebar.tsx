import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/globalStore';
import PermissionGuard from './PermissionGuard';
import { useTranslation } from 'next-i18next';
import NavItem from './NavItem';
import ServiceSwitcher from './ServiceSwitcher';
import Icon, { IconName } from './ui/Icon';
import { term } from '@/lib/terminology';

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
  /** App registry key this route belongs to (docs/APPS-MODEL.md). Absent = always shown. */
  appKey?: string;
  /** Any-of app keys (alternative to single appKey). */
  appKeys?: string[];
}

interface NavSection {
  id: string;
  label?: string;
  /** Any-of permissions gate for the whole section. */
  permissions?: string[];
  permission?: string;
  /** Plan-module keys this section belongs to (any-of). Absent = always. */
  moduleKeys?: string[];
  items: NavLeaf[];
}

interface AppSidebarProps {
  /** Render for the mobile drawer (no fixed positioning). */
  mobile?: boolean;
  /** Called after a nav link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
}

/** Plan-module vocabulary is fuzzy across backends — match by alias substring. */
const MODULE_ALIASES: Record<string, string[]> = {
  rms: ['rms', 'restaurant', 'hospitality', 'menu', 'order', 'table'],
  ims: ['ims', 'inventory', 'stock'],
  sales: ['sales', 'invoice', 'customer'],
  accounting: ['accounting', 'finance', 'ledger'],
  hrms: ['hrms', 'hr', 'people', 'payroll'],
};

const ALL_MODULES_KEY = 'kuza.showAllModules';

/** Edition chip shown in the business block (legacy types map to their edition). */
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
    activeWorkspace,
    setAvailableGroups,
    hydrateWorkspace,
  } = useTenantStore();
  /** i18next returns the raw key when a translation is missing — fall back to English. */
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return !v || v === key ? fallback : v;
  };
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  // Tenant context (business type + plan modules) — fetched once, cached in the store.
  // NOTE: keyed on `user`, not user.businessId — /me may not carry a business object
  // in the multi-tenant setup (businessId normalizes to ''), but /settings is tenant-scoped.
  useEffect(() => {
    if (user) {
      fetchTenantContext();
    }
  }, [user, fetchTenantContext]);

  // "All modules" preference + persisted workspace
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShowAll(localStorage.getItem(ALL_MODULES_KEY) === 'true');
    }
    hydrateWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleShowAll = () => {
    setShowAll((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(ALL_MODULES_KEY, String(next));
      }
      return next;
    });
  };

  const hasModule = useCallback(
    (keys?: string[]) => {
      if (!keys || keys.length === 0) return true;
      if (!planModules) return true; // unknown -> never hide (graceful fallback)
      return keys.some((key) => {
        const aliases = MODULE_ALIASES[key] ?? [key];
        return planModules.some((m) => aliases.some((a) => m.includes(a) || a.includes(m)));
      });
    },
    [planModules],
  );

  // ---- Section catalog -------------------------------------------------

  const overview: NavSection = {
    id: 'overview',
    items: [{ href: '/', label: tr('dashboard', 'Home'), icon: 'home', exact: true }],
  };

  const restaurant: NavSection = {
    id: 'restaurant',
    label: term(businessType, 'posSection'),
    moduleKeys: ['rms'],
    permissions: ['menus.view', 'orders.view', 'tables.view', 'reports.view'],
    items: [
      {
        href: '/rms/orders/create',
        label: term(businessType, 'pos'),
        icon: 'building-storefront',
        permission: 'orders.create',
        appKey: 'pos',
        exact: true,
      },
      {
        href: '/rms/orders',
        label: tr('orders', 'Orders'),
        icon: 'receipt',
        permission: 'orders.view',
        appKey: 'pos',
        exclude: ['/rms/orders/create'],
      },
      { href: '/rms/tables', label: tr('tables', 'Tables'), icon: 'table-cells', permission: 'tables.view', appKey: 'tables' },
      { href: '/rms/menus', label: tr('menuManagement', 'Menus'), icon: 'menu-book', permission: 'menus.view', appKey: 'menu' },
      { href: '/rms/reports', label: tr('analytics', 'Analytics'), icon: 'chart-bar', permission: 'reports.view', appKey: 'pos' },
    ],
  };

  const menuStudio: NavSection = {
    id: 'menu-studio',
    label: 'Menu Studio',
    moduleKeys: ['rms'],
    items: [{ href: '/menu-studio', label: 'Menu Studio', icon: 'sparkles', appKey: 'menu' }],
  };

  const inventory: NavSection = {
    id: 'inventory',
    label: term(businessType, 'inventorySection'),
    moduleKeys: ['ims'],
    permission: 'inventory.view',
    items: [
      { href: '/ims/inventory', label: term(businessType, 'itemsNav'), icon: 'cube', also: ['/inventory'], appKey: 'items' },
      { href: '/ims/inflows', label: term(businessType, 'goodsIn'), icon: 'inbox-arrow', permission: 'inflows.view', appKey: 'goods-in' },
      { href: '/ims/branch-items', label: tr('branchItems', 'Branch Items'), icon: 'building-storefront', appKey: 'items' },
      { href: '/ims/adjustments', label: tr('adjustments', 'Adjustments'), icon: 'adjustments', appKey: 'items' },
      { href: '/ims/stock-movements', label: tr('stockLedger', 'Stock Ledger'), icon: 'arrows-right-left', appKey: 'items' },
    ],
  };

  const sales: NavSection = {
    id: 'sales',
    label: 'Sales',
    moduleKeys: ['sales'],
    permission: 'sales.view',
    items: [
      { href: '/sales/customers', label: tr('customers', 'Customers'), icon: 'users', appKey: 'customers' },
      { href: '/sales/invoices', label: tr('invoices', 'Invoices'), icon: 'document-text', appKey: 'invoicing' },
    ],
  };

  const accounting: NavSection = {
    id: 'accounting',
    label: 'Accounting',
    moduleKeys: ['accounting'],
    permission: 'accounting.view',
    items: [
      { href: '/accounting', label: 'Overview', icon: 'calculator', exact: true, appKey: 'books' },
      { href: '/accounting/chart-of-accounts', label: tr('chartOfAccounts', 'Chart of Accounts'), icon: 'book-open', appKey: 'books' },
      { href: '/accounting/journal-entries', label: tr('journalEntries', 'Journal Entries'), icon: 'pencil-square', appKey: 'books' },
      { href: '/accounting/reports', label: tr('reports', 'Reports'), icon: 'chart-bar', appKey: 'books' },
    ],
  };

  // Condensed money section for the hospitality edition
  const money: NavSection = {
    id: 'money',
    label: 'Money',
    moduleKeys: ['sales', 'accounting'],
    permissions: ['sales.view', 'accounting.view'],
    items: [
      { href: '/sales/invoices', label: tr('invoices', 'Invoices'), icon: 'document-text', permission: 'sales.view', appKey: 'invoicing' },
      { href: '/sales/customers', label: tr('customers', 'Customers'), icon: 'users', permission: 'sales.view', appKey: 'customers' },
      {
        href: '/accounting/reports',
        label: tr('reports', 'Reports'),
        icon: 'chart-bar',
        permission: 'accounting.view',
        also: ['/accounting'],
        appKey: 'books',
      },
    ],
  };

  const hr: NavSection = {
    id: 'hr',
    label: 'Human Resources',
    moduleKeys: ['hrms'],
    permissions: [
      'employees.view',
      'attendance.view',
      'leaves.view',
      'payroll.view',
      'recruitment.view',
      'performance.view',
      'learning.view',
      'benefits.view',
      'compensation.view',
    ],
    items: [
      { href: '/hrms/dashboard', label: tr('dashboard', 'Dashboard'), icon: 'home', exact: true, appKey: 'people' },
      { href: '/hrms/employees', label: tr('employees', 'Employees'), icon: 'users', permission: 'employees.view', appKey: 'people' },
      { href: '/hrms/attendance', label: tr('attendance', 'Attendance'), icon: 'clock', permission: 'attendance.view', appKey: 'people' },
      { href: '/hrms/leaves', label: tr('leaves', 'Leaves'), icon: 'calendar', permission: 'leaves.view', appKey: 'people' },
      { href: '/hrms/payroll', label: tr('payroll', 'Payroll'), icon: 'banknotes', permission: 'payroll.view', appKey: 'payroll' },
      { href: '/hrms/recruitment', label: tr('recruitment', 'Recruitment'), icon: 'briefcase', permission: 'recruitment.view', appKey: 'people' },
      { href: '/hrms/performance', label: tr('performance', 'Performance'), icon: 'star', permission: 'performance.view', appKey: 'people' },
      { href: '/hrms/learning', label: tr('learning', 'Learning'), icon: 'academic-cap', permission: 'learning.view', appKey: 'people' },
      { href: '/hrms/benefits', label: tr('benefits', 'Benefits'), icon: 'heart', permission: 'benefits.view', appKey: 'people' },
      { href: '/hrms/compensation', label: tr('compensation', 'Compensation'), icon: 'wallet', permission: 'compensation.view', appKey: 'people' },
    ],
  };

  const workspace: NavSection = {
    id: 'workspace',
    label: 'Settings',
    items: [
      { href: '/rms/suppliers', label: tr('suppliers', 'Suppliers'), icon: 'truck', permission: 'suppliers.view', appKey: 'goods-in' },
      { href: '/settings/branches', label: tr('branch', 'Branches'), icon: 'git-branch', permission: 'branches.view', appKeys: ['items', 'pos', 'people'] },
      { href: '/settings/categories', label: tr('categories', 'Categories'), icon: 'folder', permission: 'inventory.view', appKey: 'items' },
      { href: '/settings/uoms', label: tr('uoms', 'Units of Measure'), icon: 'scale', permission: 'uoms.view', appKey: 'items' },
      { href: '/settings/allocation-method', label: tr('allocationMethod', 'Allocation Method'), icon: 'adjustments', permission: 'settings.view', appKeys: ['items', 'pos'] },
      { href: '/hrms/departments', label: tr('departments', 'Departments'), icon: 'building-office', permission: 'departments.view', appKey: 'people' },
      { href: '/hrms/positions', label: tr('positions', 'Positions'), icon: 'briefcase', permission: 'positions.view', appKey: 'people' },
      { href: '/hrms/locations', label: tr('locations', 'Locations'), icon: 'map-pin', permission: 'locations.view', appKey: 'people' },
      { href: '/settings/users', label: tr('users', 'Users'), icon: 'user', permission: 'users.view' },
      { href: '/settings/roles', label: tr('roles', 'Roles'), icon: 'shield', permission: 'roles.view' },
      { href: '/settings/invitations', label: tr('invitations', 'Invitations'), icon: 'envelope', permission: 'invitations.view' },
      { href: '/settings/apps', label: tr('apps', 'Apps'), icon: 'squares-2x2', permission: 'settings.view' },
      { href: '/settings/billing', label: tr('billing', 'Billing'), icon: 'credit-card', permission: 'settings.view' },
      { href: '/settings', label: 'General', icon: 'cog', exact: true },
    ],
  };

  // ---- Progressive disclosure ------------------------------------------

  const fullCatalog: NavSection[] = [overview, restaurant, menuStudio, inventory, sales, accounting, hr, workspace];

  const isAppEnabled = useCallback(
    (item: NavLeaf) => {
      if (!effectiveApps) return true; // legacy backend: show all
      const keys = item.appKeys ?? (item.appKey ? [item.appKey] : []);
      if (keys.length === 0) return true; // always-on item (Users, Roles, General, ...)
      return keys.some((k) => effectiveApps.includes(k));
    },
    [effectiveApps],
  );

  // Effective sections = tenant's apps/plan filtering, independent of UI toggles.
  let effectiveSections: NavSection[];
  if (effectiveApps) {
    // Apps model: render whatever is enabled, in registry/catalog order.
    // Sections whose every route belongs to a disabled app disappear.
    effectiveSections = fullCatalog
      .map((s) => ({ ...s, items: s.items.filter(isAppEnabled) }))
      .filter((s) => s.items.length > 0);
  } else if (businessType === 'restaurant' || businessType === 'hospitality') {
    effectiveSections = [overview, restaurant, menuStudio, inventory, money, workspace].filter((s) =>
      hasModule(s.moduleKeys),
    );
  } else if (businessType === 'accounts') {
    effectiveSections = [overview, sales, accounting, workspace].filter((s) => hasModule(s.moduleKeys));
  } else if (businessType === 'hr') {
    effectiveSections = [overview, hr, workspace].filter((s) => hasModule(s.moduleKeys));
  } else if (businessType === 'warehouse') {
    effectiveSections = [overview, inventory, workspace].filter((s) => hasModule(s.moduleKeys));
  } else {
    // general / retail / services (and unknown -> safe default)
    effectiveSections = [overview, inventory, sales, accounting, hr, workspace].filter((s) =>
      hasModule(s.moduleKeys),
    );
  }

  // App groupings the workspace switcher offers (everything except Home/Settings).
  const groups = effectiveSections.filter((s) => s.id !== 'overview' && s.id !== 'workspace');
  const groupIdsKey = groups.map((g) => g.id).join(',');
  useEffect(() => {
    setAvailableGroups(groupIdsKey ? groupIdsKey.split(',') : []);
  }, [groupIdsKey, setAvailableGroups]);

  // Resolve the workspace: single-app tenants are auto-locked to their group;
  // a stale/ineffective persisted choice falls back to "all". Composes on top
  // of effective-apps filtering — it can only narrow, never widen.
  const resolvedWorkspace =
    groups.length === 1
      ? groups[0].id
      : activeWorkspace !== 'all' && groups.some((g) => g.id === activeWorkspace)
      ? activeWorkspace
      : 'all';

  /** Apps model + "All modules": locked apps render greyed with a lock, not hidden. */
  let showLocked = false;
  let sections: NavSection[];
  if (showAll) {
    // Debug reveal: everything, bypassing workspace + app filters.
    showLocked = !!effectiveApps;
    sections = fullCatalog;
  } else if (resolvedWorkspace === 'all') {
    sections = effectiveSections;
  } else {
    sections = effectiveSections.filter(
      (s) => s.id === 'overview' || s.id === 'workspace' || s.id === resolvedWorkspace,
    );
  }

  const isItemActive = useCallback(
    (item: NavLeaf) => {
      if ((item.exclude ?? []).some((p) => pathname.startsWith(p))) return false;
      if (item.exact) {
        if (pathname === item.href) return true;
      } else if (pathname.startsWith(item.href)) {
        return true;
      }
      return (item.also ?? []).some((p) => pathname.startsWith(p));
    },
    [pathname],
  );

  // Keep the section that owns the current route expanded.
  useEffect(() => {
    const active = sections.find((s) => s.items.some(isItemActive));
    if (active) {
      setCollapsed((prev) => (prev[active.id] ? { ...prev, [active.id]: false } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSection = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderSection = (section: NavSection) => {
    const isCollapsed = !!collapsed[section.id];
    const body = (
      <div className={section.label ? 'mt-6' : ''}>
        {section.label && (
          <button
            type="button"
            onClick={() => toggleSection(section.id)}
            aria-expanded={!isCollapsed}
            className="group flex w-full items-center justify-between rounded-md px-3 pb-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span className="text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors duration-150">
              {section.label}
            </span>
            <Icon
              name="chevron-down"
              size={12}
              className={`text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-150 ${
                isCollapsed ? '-rotate-90' : ''
              }`}
            />
          </button>
        )}
        {!isCollapsed && (
          <div className="space-y-px">
            {section.items.map((item) => {
              const locked = showLocked && !isAppEnabled(item);
              const link = locked ? (
                <Link
                  href="/settings/apps"
                  onClick={onNavigate}
                  title="Not in your apps — enable it in Settings → Apps or upgrade your plan"
                  className="group flex items-center gap-2.5 rounded-lg px-3 h-9 text-sm text-gray-400 dark:text-gray-600 opacity-60 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <Icon name={item.icon} size={18} className="text-gray-300 dark:text-gray-600" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <Icon name="lock" size={13} className="text-gray-300 dark:text-gray-600" />
                </Link>
              ) : (
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
            })}
          </div>
        )}
      </div>
    );

    if (section.permissions) {
      return (
        <PermissionGuard key={section.id} permissions={section.permissions}>
          {body}
        </PermissionGuard>
      );
    }
    if (section.permission) {
      return (
        <PermissionGuard key={section.id} permission={section.permission}>
          {body}
        </PermissionGuard>
      );
    }
    return <div key={section.id}>{body}</div>;
  };

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
      {/* Business block + workspace switcher (~64px) */}
      <div className="px-2 pt-2.5 pb-1.5 shrink-0">
        <ServiceSwitcher
          businessName={businessName}
          edition={EDITION_CHIPS[businessType ?? ''] ?? null}
          groups={groups.map((g) => ({ id: g.id, name: g.label ?? g.id }))}
          activeWorkspace={resolvedWorkspace}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3">
        {sections.map(renderSection)}
      </nav>

      {/* Upgrade promo — only for FREE / TRIALING tenants */}
      {(planCode === 'FREE' || subscriptionStatus === 'TRIALING') && (
        <div className="shrink-0 px-2 pb-2">
          <div className="rounded-2xl bg-brand-50/80 dark:bg-brand-500/10 ring-1 ring-brand-100 dark:ring-brand-500/20 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
                <Icon name="sparkles" size={13} />
              </span>
              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Upgrade plan</p>
            </div>
            <p className="mt-1.5 text-xs leading-4 text-gray-500 dark:text-gray-400">
              Unlock your full business
            </p>
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

      {/* All modules toggle */}
      <div className="shrink-0 px-2 pb-1">
        <button
          type="button"
          onClick={toggleShowAll}
          aria-pressed={showAll}
          className="flex w-full items-center gap-2 rounded-md px-2 h-7 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Icon name="squares-2x2" size={14} />
          <span className="flex-1 text-left">All modules</span>
          <span
            className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors duration-150 ${
              showAll ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            aria-hidden="true"
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full bg-white transition-transform duration-150 ${
                showAll ? 'translate-x-3' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>
      </div>

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
