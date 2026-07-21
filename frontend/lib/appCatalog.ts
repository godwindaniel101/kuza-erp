import { IconName } from '@/components/ui/Icon';

/**
 * The COARSE apps the product is organized into — the same set the sidebar shows,
 * so the top-bar launcher lists real apps (Restaurant/Shop, Inventory, Invoicing,
 * …) and not granular registry keys. Single source for launcher + quick-create.
 *
 * Restaurant (hospitality) and Shop (retail) are DISTINCT apps — a tenant sees one
 * or the other by vertical, never both.
 */
/**
 * The single source of truth for the product's coarse apps. Both the header
 * launcher (via availableCoarseApps) and the AppSidebar consume THIS list — the
 * sidebar extends each entry with its own runtime nav `groups`. Keep app-level
 * metadata (name, icon, home, appKeys, businessTypes, blurb, moduleKeys) here
 * only; do not re-declare it in the sidebar (that duplication had drifted).
 */
export interface CoarseApp {
  id: string;
  name: string;
  icon: IconName;
  /** One-line description shown in the launcher grid. */
  blurb: string;
  home: string;
  /** Plan-module keys this app maps to (any-of). Absent = always available. */
  moduleKeys?: string[];
  /** Any-of registry keys that enable this app. null = always available. */
  appKeys: string[] | null;
  /** Vertical gate: only show for these businessTypes (null businessType -> 'retail'). */
  businessTypes?: string[];
}

export const COARSE_APPS: CoarseApp[] = [
  { id: 'restaurant', name: 'Restaurant', icon: 'table-cells', blurb: 'Sell, dine-in tables, menus and QR menu', home: '/', moduleKeys: ['rms'], appKeys: ['rms'] },
  { id: 'inventory', name: 'Inventory', icon: 'cube', blurb: 'Track stock, receive goods and value your inventory', home: '/ims', moduleKeys: ['ims'], appKeys: ['items'] },
  { id: 'sales', name: 'Invoicing', icon: 'banknotes', blurb: 'Customers, invoices and getting paid', home: '/sales', moduleKeys: ['sales'], appKeys: ['invoicing'] },
  { id: 'accounting', name: 'Accounting', icon: 'calculator', blurb: 'Double-entry books, ledger and financial reports', home: '/accounting', moduleKeys: ['accounting'], appKeys: ['books'] },
  { id: 'hr', name: 'People', icon: 'users', blurb: 'Employees, attendance, leave and payroll', home: '/hrms/dashboard', moduleKeys: ['hrms'], appKeys: ['people'] },
  { id: 'payments', name: 'Payments', icon: 'credit-card', blurb: 'Take payments and tie them to sales in real time', home: '/payments', moduleKeys: ['payments'], appKeys: ['payments'] },
  { id: 'settings', name: 'Settings', icon: 'cog', blurb: 'Users, roles, branches and billing', home: '/settings', appKeys: null },
];

export function appDisplayName(app: CoarseApp): string {
  return app.name;
}

/** Coarse apps the tenant can access (vertical + subscription gated). */
export function availableCoarseApps(effectiveApps: string[] | null, businessType?: string | null): CoarseApp[] {
  return COARSE_APPS.filter((a) => {
    if (a.businessTypes) {
      const bt = businessType || 'retail'; // null/legacy -> retail default
      if (!a.businessTypes.includes(bt)) return false;
    }
    if (a.appKeys === null) return true; // settings always
    if (!effectiveApps) return true; // legacy tenant / still loading -> show all
    return a.appKeys.some((k) => effectiveApps.includes(k));
  });
}

/** Whether a single registry app-key is available to the tenant. */
export function hasAppKey(key: string, effectiveApps: string[] | null): boolean {
  if (!effectiveApps) return true;
  return effectiveApps.includes(key);
}
