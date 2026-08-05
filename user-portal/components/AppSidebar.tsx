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
import { COARSE_APPS, CoarseApp } from '@/lib/appCatalog';

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

/**
 * An app = its canonical metadata (from the shared COARSE_APPS catalog) plus
 * this sidebar's runtime nav groups. App-level fields live in the catalog only.
 */
interface AppDef extends CoarseApp {
  groups: NavGroup[];
}

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  /** Desktop: slide the sidebar off-screen (animated) instead of unmounting. */
  collapsed?: boolean;
}

/**
 * The VERTICAL apps (one per tenant, by businessType). The `/` workspace must
 * always resolve to one of these — never a common app (payments/invoicing/
 * accounting/people) — so a tenant lands in its real product, not a bolt-on.
 */
const VERTICAL_APP_IDS = ['storefront', 'inventory', 'restaurant'];

/** Plan-module vocabulary is fuzzy across backends — match by alias substring. */
const MODULE_ALIASES: Record<string, string[]> = {
  rms: ['rms', 'restaurant', 'hospitality', 'menu', 'order', 'table', 'pos'],
  ims: ['ims', 'inventory', 'stock'],
  sales: ['sales', 'invoice', 'customer'],
  accounting: ['accounting', 'finance', 'ledger'],
  hrms: ['hrms', 'hr', 'people', 'payroll'],
};

export default function AppSidebar({ mobile = false, onNavigate, collapsed = false }: AppSidebarProps) {
  const router = useRouter();
  const { pathname } = router;
  const { t } = useTranslation('common');
  const { user } = useAuthStore();
  const {
    businessType,
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


  useEffect(() => {
    if (user) fetchTenantContext();
  }, [user, fetchTenantContext]);

  // ---- App catalog -----------------------------------------------------

  // Sidebar nav groups per app id. App-level metadata (name/icon/home/appKeys/
  // businessTypes/blurb) lives in the shared COARSE_APPS catalog — see below.
  const groupsByApp: Record<string, NavGroup[]> = {
    // RESTAURANT — selling (POS + orders) plus dine-in (tables, menus, QR).
    // Point of Sale is not a separate app; it's a section here and in Inventory.
    restaurant: [
      { items: [{ href: '/', label: tr('dashboard', 'Dashboard'), icon: 'home', exact: true }] },
      {
        label: tr('nav.sell', 'Sell'),
        items: [
          { href: '/pos', label: term(businessType, 'pos'), icon: 'building-storefront', permission: 'orders.create', exact: true },
          { href: '/rms/orders', label: tr('nav.sales', 'Sales'), icon: 'receipt', permission: 'orders.view', exclude: ['/rms/orders/create'] },
        ],
      },
      {
        label: tr('nav.dineIn', 'Dine-in'),
        items: [
          { href: '/rms/tables', label: tr('tables', 'Tables'), icon: 'table-cells', permission: 'tables.view' },
        ],
      },
      {
        label: tr('nav.menu', 'Menu'),
        items: [
          { href: '/rms/items', label: term(businessType, 'itemsNav'), icon: 'cube', permission: 'inventory.view' },
          { href: '/rms/menus', label: tr('nav.menus', 'Menus'), icon: 'menu-book', permission: 'menus.view', also: ['/menu-studio'] },
          { href: '/rms/reservations', label: tr('reservations', 'Reservations'), icon: 'calendar', permission: 'reservations.view' },
        ],
      },
      {
        // Market stays within the Restaurant module (resolves to this app, like POS).
        label: tr('nav.purchasing', 'Purchasing'),
        items: [
          { href: '/market', label: tr('nav.market', 'Market'), icon: 'squares-2x2' },
        ],
      },
      {
        label: tr('nav.insights', 'Insights'),
        items: [{ href: '/rms/reports', label: tr('analytics', 'Analytics'), icon: 'chart-bar', permission: 'reports.view' }],
      },
      {
        // Same shared Setup workspace as Inventory — one entry, no duplication.
        items: [
          {
            href: '/settings/branches',
            label: tr('configuration', 'Configuration'),
            icon: 'cog',
            permission: 'branches.view',
            also: ['/settings/categories', '/settings/uoms', '/settings/allocation-method', '/rms/suppliers'],
          },
        ],
      },
    ],
    inventory: [
      { items: [{ href: '/ims', label: tr('dashboard', 'Dashboard'), icon: 'home', exact: true }] },
      // Sell (POS + Sales) is a section in Inventory. It's a shared selling
      // surface (also in Restaurant); the sticky app-resolution keeps POS/Sales
      // in whichever app you opened them from, so they never cross-jump.
      {
        label: tr('nav.sell', 'Sell'),
        items: [
          { href: '/pos', label: term(businessType, 'pos'), icon: 'building-storefront' as IconName, permission: 'orders.create', exact: true },
          { href: '/rms/orders', label: tr('nav.sales', 'Sales'), icon: 'receipt' as IconName, permission: 'orders.view', exclude: ['/rms/orders/create'] },
        ],
      },
      {
        label: tr('nav.stock', 'Stock'),
        items: [
          { href: '/ims/branch-items', label: term(businessType, 'branchStock'), icon: 'building-storefront' },
          { href: '/ims/inventory', label: term(businessType, 'itemsNav'), icon: 'cube', permission: 'inventory.view', also: ['/inventory'] },
          { href: '/ims/transfers', label: tr('transfers', 'Transfers'), icon: 'arrows-right-left', permission: 'inventory.view' },
          { href: '/ims/adjustments', label: tr('adjustments', 'Adjustments'), icon: 'adjustments' },
          { href: '/ims/stock-movements', label: tr('stockLedger', 'Stock Ledger'), icon: 'arrows-right-left' },
        ],
      },
      {
        // Purchasing (buy-side): Purchases (receipts + supplier POs), your
        // suppliers, and the cross-tenant Market. JWT-only (no plan gate).
        label: tr('nav.purchasing', 'Purchasing'),
        items: [
          { href: '/ims/inflows', label: tr('nav.purchases', 'Purchases'), icon: 'inbox-arrow', permission: 'inflows.view' },
          { href: '/market', label: tr('nav.market', 'Market'), icon: 'squares-2x2' },
        ],
      },
      {
        // Single entry into the shared Setup workspace (Branches, Categories,
        // Units, Allocation live there behind their own left rail).
        items: [
          {
            href: '/settings/branches',
            label: tr('configuration', 'Configuration'),
            icon: 'cog',
            permission: 'branches.view',
            also: ['/settings/categories', '/settings/uoms', '/settings/allocation-method', '/rms/suppliers'],
          },
        ],
      },
    ],
    // STOREFRONT (shop vertical) — sell online on the tenant's live stock. The
    // catalog/stock an online seller manages lives on the shared IMS pages, so
    // reuse that nav here (Stock Items, Branch Stock, Categories) to keep the
    // workspace functional. Per-item listing toggles / orders come in Phase 2/3.
    // WEBSITE (common) — a simple marketing site builder. Phase 1 is a single
    // overview/settings page; the section editor arrives in Phase 2.
    website: [
      { items: [{ href: '/website', label: tr('nav.overview', 'Overview'), icon: 'globe-alt', exact: true }] },
    ],
    storefront: [
      { items: [{ href: '/storefront', label: tr('nav.overview', 'Overview'), icon: 'building-storefront', exact: true }] },
      {
        label: tr('nav.catalog', 'Catalog'),
        items: [
          { href: '/ims/inventory', label: term(businessType, 'itemsNav'), icon: 'cube', permission: 'inventory.view', also: ['/inventory'] },
          { href: '/ims/branch-items', label: term(businessType, 'branchStock'), icon: 'building-storefront', permission: 'inventory.view' },
          { href: '/settings/categories', label: tr('categories', 'Categories'), icon: 'folder', permission: 'inventory.view' },
        ],
      },
      {
        label: tr('nav.stock', 'Stock'),
        items: [
          { href: '/ims/adjustments', label: tr('adjustments', 'Adjustments'), icon: 'adjustments' },
          { href: '/ims/stock-movements', label: tr('stockLedger', 'Stock Ledger'), icon: 'arrows-right-left' },
        ],
      },
    ],
    sales: [
      { items: [{ href: '/sales', label: tr('dashboard', 'Dashboard'), icon: 'home', exact: true }] },
      {
        items: [
          { href: '/sales/invoices', label: tr('invoices', 'Invoices'), icon: 'document-text', permission: 'sales.view', exclude: ['/sales/invoices/new'] },
        ],
      },
      {
        label: tr('nav.setup', 'Setup'),
        items: [
          { href: '/sales/customers', label: tr('customers', 'Customers'), icon: 'users', permission: 'sales.view' },
          { href: '/settings/invoicing', label: tr('nav.setupTemplate', 'Setup template'), icon: 'cog', permission: 'sales.manage' },
        ],
      },
    ],
    accounting: [
      {
        items: [
          { href: '/accounting', label: tr('nav.overview', 'Overview'), icon: 'home', exact: true },
          { href: '/accounting/chart-of-accounts', label: tr('chartOfAccounts', 'Chart of Accounts'), icon: 'book-open' },
          { href: '/accounting/journal-entries', label: tr('journalEntries', 'Journal Entries'), icon: 'pencil-square' },
          { href: '/accounting/reports', label: tr('reports', 'Reports'), icon: 'chart-bar' },
        ],
      },
    ],
    ai: [
      {
        items: [
          { href: '/ai', label: tr('nav.overview', 'Overview'), icon: 'home', exact: true },
          { href: '/ai/agents', label: tr('nav.aiAgents', 'Agents'), icon: 'users' },
          { href: '/ai/channels', label: tr('nav.aiChannels', 'Channels'), icon: 'git-branch' },
          { href: '/ai/training', label: tr('nav.aiTraining', 'Training'), icon: 'academic-cap' },
          { href: '/ai/conversations', label: tr('nav.aiConversations', 'Conversations'), icon: 'inbox-arrow' },
        ],
      },
    ],
    hr: [
      { items: [{ href: '/hrms/dashboard', label: tr('dashboard', 'Dashboard'), icon: 'home', exact: true }] },
      {
        label: tr('nav.people', 'People'),
        items: [
          { href: '/hrms/employees', label: tr('employees', 'Employees'), icon: 'users', permission: 'employees.view' },
          { href: '/hrms/org-chart', label: tr('orgChart', 'Org chart'), icon: 'git-branch', permission: 'employees.view' },
          { href: '/hrms/attendance', label: tr('attendance', 'Attendance'), icon: 'clock', permission: 'attendance.view' },
          { href: '/hrms/leaves', label: tr('leaves', 'Leaves'), icon: 'calendar', permission: 'leaves.view' },
          { href: '/hrms/payroll', label: tr('payroll', 'Payroll'), icon: 'banknotes', permission: 'payroll.view' },
        ],
      },
      {
        label: tr('nav.talent', 'Talent'),
        items: [
          { href: '/hrms/recruitment', label: tr('recruitment', 'Recruitment'), icon: 'briefcase', permission: 'recruitment.view' },
          { href: '/hrms/performance', label: tr('performance', 'Performance'), icon: 'star', permission: 'performance.view' },
          { href: '/hrms/learning', label: tr('learning', 'Learning'), icon: 'academic-cap', permission: 'learning.view' },
        ],
      },
      {
        label: tr('nav.rewards', 'Rewards'),
        items: [
          { href: '/hrms/benefits', label: tr('benefits', 'Benefits'), icon: 'heart', permission: 'benefits.view' },
          { href: '/hrms/compensation', label: tr('compensation', 'Compensation'), icon: 'wallet', permission: 'compensation.view' },
        ],
      },
      {
        // Single entry into the People Configuration workspace (its own rail).
        items: [
          {
            href: '/hrms/departments',
            label: tr('configuration', 'Configuration'),
            icon: 'cog',
            permission: 'departments.view',
            also: ['/hrms/positions', '/hrms/locations'],
          },
        ],
      },
    ],
    // People configuration — its own left rail, entered from People → Configuration.
    'hr-config': [
      {
        label: tr('nav.organization', 'Organization'),
        items: [
          { href: '/hrms/departments', label: tr('departments', 'Departments'), icon: 'building-office', permission: 'departments.view' },
          { href: '/hrms/positions', label: tr('positions', 'Positions'), icon: 'briefcase', permission: 'positions.view' },
          { href: '/hrms/locations', label: tr('locations', 'Locations'), icon: 'map-pin', permission: 'locations.view' },
        ],
      },
    ],
    settings: [
      {
        items: [
          { href: '/settings', label: tr('nav.general', 'General'), icon: 'cog', exact: true },
          { href: '/settings/invitations', label: tr('invitations', 'Invitations'), icon: 'envelope', permission: 'invitations.view' },
          { href: '/settings/apps', label: tr('apps', 'Apps'), icon: 'squares-2x2', permission: 'settings.view' },
          { href: '/settings/api', label: tr('nav.apiAccess', 'API access'), icon: 'key', permission: 'settings.view' },
          { href: '/settings/billing', label: tr('billing', 'Billing'), icon: 'credit-card', permission: 'settings.view' },
        ],
      },
      {
        label: tr('nav.accessControl', 'Access control'),
        items: [
          { href: '/settings/users', label: tr('users', 'Users'), icon: 'user', permission: 'users.view' },
          { href: '/settings/roles', label: tr('roles', 'Roles'), icon: 'shield', permission: 'roles.view' },
          { href: '/settings/permissions', label: tr('permissions', 'Permissions'), icon: 'lock', permission: 'roles.view' },
        ],
      },
    ],
    payments: [
      { items: [{ href: '/payments', label: tr('paymentMethods', 'Payment methods'), icon: 'credit-card', exact: true, permission: 'payments.view' }] },
      { items: [{ href: '/payments/transactions', label: tr('transactions', 'Transactions'), icon: 'receipt', permission: 'payments.view' }] },
      { items: [{ href: '/payments/wallet', label: tr('nav.wallet', 'Wallet'), icon: 'wallet', permission: 'payments.view' }] },
      // Single entry into the Payments Configuration workspace (its own rail).
      { items: [{ href: '/payments/settlement', label: tr('configuration', 'Configuration'), icon: 'cog', permission: 'payments.view', also: ['/payments/security', '/payments/settlement'] }] },
    ],
    // Payments configuration — its own left rail, entered from Payments → Configuration.
    'payments-config': [
      {
        label: tr('nav.payments', 'Payments'),
        items: [
          { href: '/payments/settlement', label: tr('settlementAccount', 'Settlement account'), icon: 'banknotes' },
          { href: '/payments/security', label: tr('twoFactorAuth', 'Two-factor authentication'), icon: 'shield' },
        ],
      },
    ],
    // SETUP — shared configuration, reachable from both Inventory and Restaurant
    // via a single "Setup" link. Its own left rail (this workspace's nav) means
    // no config link is duplicated per app and entering it never cross-jumps.
    setup: [
      {
        label: tr('locations', 'Locations'),
        items: [
          { href: '/settings/branches', label: tr('branch', 'Branches'), icon: 'git-branch', permission: 'branches.view' },
        ],
      },
      {
        label: tr('nav.purchasing', 'Purchasing'),
        items: [
          { href: '/rms/suppliers', label: tr('suppliers', 'Suppliers'), icon: 'truck', permission: 'suppliers.view' },
        ],
      },
      {
        label: tr('nav.catalog', 'Catalog'),
        items: [
          { href: '/settings/categories', label: tr('categories', 'Categories'), icon: 'folder', permission: 'inventory.view' },
          { href: '/settings/uoms', label: tr('uoms', 'Units of Measure'), icon: 'scale', permission: 'uoms.view' },
        ],
      },
      {
        label: tr('nav.stockRules', 'Stock rules'),
        items: [
          { href: '/settings/market', label: tr('nav.marketSetup', 'Market Setup'), icon: 'squares-2x2', permission: 'settings.view' },
          { href: '/settings/allocation-method', label: tr('allocationMethod', 'Allocation Method'), icon: 'adjustments', permission: 'settings.view' },
        ],
      },
    ],
  };

  // Single source of truth: metadata from COARSE_APPS + this sidebar's groups.
  // Inventory keeps its terminology-aware display name per business type.
  const apps: AppDef[] = [
    ...COARSE_APPS.map((a) => ({
      ...a,
      name: a.id === 'inventory' ? term(businessType, 'inventorySection') || a.name : a.name,
      groups: groupsByApp[a.id] ?? [],
    })),
    // Setup is not a launcher app — it's a shared config workspace entered from
    // the "Setup" link in Inventory/Restaurant. Always available; kept out of
    // the launcher (which is built from COARSE_APPS) and the business-apps grid.
    {
      id: 'setup',
      name: 'Configuration',
      icon: 'cog',
      blurb: 'Shared configuration',
      home: '/settings/branches',
      appKeys: null,
      groups: groupsByApp.setup ?? [],
    } as AppDef,
    {
      id: 'hr-config',
      name: 'Configuration',
      icon: 'cog',
      blurb: 'People configuration',
      home: '/hrms/departments',
      appKeys: null,
      groups: groupsByApp['hr-config'] ?? [],
    } as AppDef,
    {
      id: 'payments-config',
      name: 'Configuration',
      icon: 'cog',
      blurb: 'Payments configuration',
      home: '/payments/settlement',
      appKeys: null,
      groups: groupsByApp['payments-config'] ?? [],
    } as AppDef,
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
      // Vertical gate: Restaurant for hospitality, Shop for everyone else.
      if (app.businessTypes) {
        const bt = businessType || 'retail'; // null/legacy -> retail default
        if (!app.businessTypes.includes(bt)) return false;
      }
      if (effectiveApps && app.appKeys) {
        return app.appKeys.some((k) => effectiveApps.includes(k));
      }
      return hasModule(app.moduleKeys);
    },
    [effectiveApps, hasModule, businessType],
  );

  const availableApps = apps.filter(isAppAvailable);
  // Settings is always reachable via the launcher, but only listed among the
  // "business apps" grid separately.
  const businessApps = availableApps.filter(
    (a) =>
      a.id !== 'settings' &&
      a.id !== 'setup' &&
      a.id !== 'hr-config' &&
      a.id !== 'payments-config',
  );

  // ---- Which app am I in? (route-driven) -------------------------------

  // Shared surfaces (Market, network orders) belong to whichever selling app you
  // came from — this remembers the last Inventory/Restaurant app so they stick to
  // it instead of cross-jumping. Updated by an effect after each render.
  const lastAppIdRef = useRef<string | null>(null);

  const appForPath = useCallback(
    (path: string): AppDef => {
      // The tenant's vertical app, derived from its actual businessType:
      // ecommerce → Storefront, hospitality → Restaurant, everything else →
      // Inventory. This is the app the `/` workspace resolves to.
      const verticalAppId =
        businessType === 'ecommerce'
          ? 'storefront'
          : businessType === 'hospitality' || businessType === 'restaurant'
          ? 'restaurant'
          : 'inventory';
      // Shared-config subpaths live in the dedicated Setup workspace (its own
      // left rail), not Settings or a module app — so it's reachable from both
      // Inventory and Restaurant without cross-jumping into either.
      // Team & access (users/roles/permissions/invitations) is org-wide — it lives
      // in the Settings app, NOT here. The Configuration workspace owns only
      // stock/operations config, so clicking Roles never bounces you into it.
      const setupPaths = ['/settings/branches', '/settings/categories', '/settings/uoms', '/settings/allocation-method', '/settings/market', '/rms/suppliers'];
      if (setupPaths.some((p) => path.startsWith(p))) return apps.find((a) => a.id === 'setup')!;

      if (
        path.startsWith('/payments/settlement') ||
        path.startsWith('/payments/security')
      )
        return apps.find((a) => a.id === 'payments-config')!;
      if (path.startsWith('/payments')) return apps.find((a) => a.id === 'payments')!;
      if (path.startsWith('/storefront')) return apps.find((a) => a.id === 'storefront')!;
      if (path.startsWith('/website')) return apps.find((a) => a.id === 'website')!;
      if (
        path.startsWith('/hrms/departments') ||
        path.startsWith('/hrms/positions') ||
        path.startsWith('/hrms/locations')
      )
        return apps.find((a) => a.id === 'hr-config')!;
      if (path.startsWith('/hrms')) return apps.find((a) => a.id === 'hr')!;
      // Shared stock/catalog UI (/ims, /inventory, /purchases) is owned by the
      // tenant's VERTICAL, not the standalone Inventory app. A Storefront or
      // Restaurant tenant manages stock inside its own workspace and must never be
      // bounced into Inventory (the verticals are mutually exclusive). Inventory
      // tenants keep resolving here to Inventory because verticalAppId === 'inventory'.
      if (path.startsWith('/ims') || path.startsWith('/inventory') || path.startsWith('/purchases'))
        return (
          businessApps.find((a) => a.id === verticalAppId) ??
          apps.find((a) => a.id === 'inventory')!
        );
      // Invoice customization lives under /settings but belongs to the Sales app.
      if (path.startsWith('/settings/invoicing')) return apps.find((a) => a.id === 'sales')!;
      if (path.startsWith('/sales')) return apps.find((a) => a.id === 'sales')!;
      if (path.startsWith('/accounting')) return apps.find((a) => a.id === 'accounting')!;
      if (path.startsWith('/ai')) return apps.find((a) => a.id === 'ai')!;
      if (path.startsWith('/settings')) return apps.find((a) => a.id === 'settings')!;
      // Shared selling/purchasing surfaces (POS, Sales, Market, network orders)
      // live in both the Inventory and Restaurant apps. Stay in whichever app
      // you came from (sticky) so they behave like a section of the current
      // module and never cross-jump; fall back to the selling app on cold load.
      if (
        path.startsWith('/market') ||
        path.startsWith('/network/orders') ||
        path.startsWith('/pos') ||
        path.startsWith('/rms/orders')
      ) {
        const sticky = lastAppIdRef.current;
        if (sticky && VERTICAL_APP_IDS.includes(sticky)) {
          const a = businessApps.find((x) => x.id === sticky);
          if (a) return a;
        }
        return (
          businessApps.find((a) => a.id === verticalAppId) ??
          businessApps.find((a) => VERTICAL_APP_IDS.includes(a.id)) ??
          businessApps[0] ??
          apps.find((a) => a.id === 'settings')!
        );
      }
      // Kuza Network lives in the Inventory app (feeds purchasing).
      // Restaurant surfaces: items catalog, dine-in tables, menus, QR menu.
      if (
        path.startsWith('/rms/items') ||
        path.startsWith('/rms/tables') ||
        path.startsWith('/rms/menus') ||
        path.startsWith('/rms/reservations') ||
        path.startsWith('/menu-studio')
      )
        return apps.find((a) => a.id === 'restaurant')!;
      // Selling surfaces (dashboard, POS, orders) belong to the tenant's selling
      // app — Restaurant for hospitality, Inventory otherwise (POS is no longer a
      // separate app). Fall back to the first available app if neither is enabled.
      if (path === '/' || path.startsWith('/pos') || path.startsWith('/rms')) {
        const selling = businessApps.find((a) => a.id === verticalAppId);
        if (selling) return selling;
        // Never masquerade a common app (payments/invoicing/…) as the vertical
        // `/` workspace: prefer ANY available vertical app, else fall back to
        // Settings. Tenants with no vertical (accounts/hr) are redirected away
        // from `/` by the login landing resolver, so this is a safe last resort.
        return (
          businessApps.find((a) => VERTICAL_APP_IDS.includes(a.id)) ??
          apps.find((a) => a.id === 'settings')!
        );
      }
      // Fallback: first available business app, else settings.
      return businessApps[0] ?? apps.find((a) => a.id === 'settings')!;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businessType, businessApps.length],
  );

  const activeApp = appForPath(pathname);
  // Secondary workspaces (Configuration, Settings) are entered from a business
  // app, so give them a Back button that restores the previous app's nav.
  const isSubApp =
    activeApp.id === 'setup' ||
    activeApp.id === 'settings' ||
    activeApp.id === 'hr-config' ||
    activeApp.id === 'payments-config';

  // Remember the current selling app so shared surfaces (Market, network orders)
  // stick to it instead of cross-jumping.
  useEffect(() => {
    if (VERTICAL_APP_IDS.includes(activeApp.id)) {
      lastAppIdRef.current = activeApp.id;
    }
  }, [activeApp.id]);

  // Remember the last business-app page so Back returns to that exact navbar
  // position (not browser-history back, which just walks the sub-nav).
  const lastBusinessPathRef = useRef<string>('/');
  useEffect(() => {
    if (!isSubApp) lastBusinessPathRef.current = router.asPath;
  }, [router.asPath, isSubApp]);
  const backPath = lastBusinessPathRef.current || '/';
  const backApp = appForPath(backPath);

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

  return (
    <aside
      className={`${
        mobile
          ? 'flex h-full w-full'
          : `hidden lg:flex fixed left-0 top-0 h-full z-30 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out ${
              collapsed ? '-translate-x-full' : 'translate-x-0'
            }`
      } flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800`}
      style={mobile ? undefined : { width: 'var(--sidebar-width)' }}
      aria-hidden={!mobile && collapsed}
    >
      {/* Current app identity. On a secondary workspace (Configuration,
          Settings) the subtitle becomes a Back link that restores the previous
          business app's navbar (exact page), not browser-history back. */}
      <div className="shrink-0 px-2 pt-2.5 pb-2">
        <div className="flex w-full items-center gap-2.5 rounded-xl p-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
            <Icon name={activeApp.icon} size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {activeApp.name}
            </span>
            {isSubApp && (
              <button
                type="button"
                onClick={() => {
                  if (mobile) onNavigate?.();
                  router.push(backPath);
                }}
                className="mt-0.5 flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
              >
                <Icon name="arrow-left" size={12} />
                <span className="truncate">{t('backTo') || 'Back to'} {backApp.name}</span>
              </button>
            )}
          </span>
        </div>
      </div>

      {/* Active app navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3">
        {/* Keyed on the app id so nav groups gracefully re-reveal (staggered)
            when switching apps, but stay put during in-app page navigation. */}
        <div key={activeApp.id} className="app-nav-enter">
          {activeApp.groups.map(renderGroup)}
        </div>
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

    </aside>
  );
}
