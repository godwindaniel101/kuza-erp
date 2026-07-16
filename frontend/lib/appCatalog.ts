import { IconName } from '@/components/ui/Icon';

/**
 * The COARSE apps the product is organized into — the same set the sidebar shows,
 * so the top-bar launcher lists real apps (Restaurant/Shop, Inventory, Invoicing,
 * …) and not granular registry keys. Single source for launcher + quick-create.
 *
 * Restaurant (hospitality) and Shop (retail) are DISTINCT apps — a tenant sees one
 * or the other by vertical, never both.
 */
export interface CoarseApp {
  id: string;
  name: string;
  icon: IconName;
  home: string;
  /** Any-of registry keys that enable this app. null = always available. */
  appKeys: string[] | null;
  /** Vertical gate: only show for these businessTypes (null businessType -> 'retail'). */
  businessTypes?: string[];
}

export const COARSE_APPS: CoarseApp[] = [
  { id: 'restaurant', name: 'Restaurant', icon: 'building-storefront', home: '/', appKeys: ['pos', 'tables', 'menu'], businessTypes: ['hospitality', 'restaurant'] },
  { id: 'shop', name: 'Shop', icon: 'building-storefront', home: '/', appKeys: ['pos'], businessTypes: ['retail', 'general', 'accounts', 'services', 'warehouse'] },
  { id: 'inventory', name: 'Inventory', icon: 'cube', home: '/ims', appKeys: ['items', 'goods-in'] },
  { id: 'sales', name: 'Invoicing', icon: 'banknotes', home: '/sales', appKeys: ['customers', 'invoicing'] },
  { id: 'accounting', name: 'Accounting', icon: 'calculator', home: '/accounting', appKeys: ['books', 'insights'] },
  { id: 'hr', name: 'People', icon: 'users', home: '/hrms/dashboard', appKeys: ['people', 'payroll'] },
  { id: 'settings', name: 'Settings', icon: 'cog', home: '/settings', appKeys: null },
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
