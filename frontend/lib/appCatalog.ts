import { IconName } from '@/components/ui/Icon';

/**
 * The COARSE apps the product is organized into — the same 7 the sidebar shows,
 * so the top-bar launcher lists real apps (Restaurant, Inventory, Sales, …) and
 * not granular registry keys (Items, Goods In, Tables …). Single source for the
 * launcher + quick-create availability.
 */
export interface CoarseApp {
  id: string;
  name: string;
  /** Display name override for the hospitality edition. */
  hospitalityName?: string;
  /** Display name override for the retail edition. */
  retailName?: string;
  icon: IconName;
  home: string;
  /** Any-of registry keys that enable this app. null = always available. */
  appKeys: string[] | null;
}

export const COARSE_APPS: CoarseApp[] = [
  { id: 'pos', name: 'Point of Sale', hospitalityName: 'Restaurant', retailName: 'Shop', icon: 'building-storefront', home: '/', appKeys: ['pos', 'tables', 'menu'] },
  { id: 'inventory', name: 'Inventory', icon: 'cube', home: '/ims', appKeys: ['items', 'goods-in'] },
  { id: 'sales', name: 'Sales', icon: 'banknotes', home: '/sales', appKeys: ['customers', 'invoicing'] },
  { id: 'accounting', name: 'Accounting', icon: 'calculator', home: '/accounting', appKeys: ['books', 'insights'] },
  { id: 'hr', name: 'People', icon: 'users', home: '/hrms/dashboard', appKeys: ['people', 'payroll'] },
  { id: 'settings', name: 'Settings', icon: 'cog', home: '/settings', appKeys: null },
];

export function appDisplayName(app: CoarseApp, businessType?: string | null): string {
  if (app.hospitalityName && (businessType === 'restaurant' || businessType === 'hospitality')) {
    return app.hospitalityName;
  }
  if (app.retailName && businessType === 'retail') {
    return app.retailName;
  }
  return app.name;
}

/** Coarse apps the tenant can access. effectiveApps null = legacy/all. */
export function availableCoarseApps(effectiveApps: string[] | null): CoarseApp[] {
  return COARSE_APPS.filter((a) => {
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
