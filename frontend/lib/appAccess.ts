/**
 * Client-side app-access guard rails.
 *
 * Maps a route to the app-registry keys that grant access to it, and decides
 * whether the current tenant (by its effectiveApps) may view that route. This
 * mirrors the backend FeatureGateGuard so a user can't reach an app they don't
 * have just by typing the URL — the sidebar already hides it; this blocks it.
 *
 * Keys match backend/src/common/apps/app-registry.ts:
 *   items, goods-in, pos, tables, menu, kuza-menu, customers, invoicing,
 *   books, insights, people, payroll, payments, audit
 */

interface RouteRule {
  /** Route prefix (most-specific first). */
  prefix: string;
  /** Any-of app keys that grant access. */
  keys: string[];
}

// Ordered most-specific first — the first matching prefix wins.
const ROUTE_RULES: RouteRule[] = [
  { prefix: '/rms/suppliers', keys: ['items', 'goods-in'] }, // purchasing lives in Inventory
  { prefix: '/rms/menus', keys: ['menu', 'kuza-menu'] },
  { prefix: '/menu-studio', keys: ['kuza-menu', 'menu'] },
  { prefix: '/rms/tables', keys: ['tables', 'pos'] },
  { prefix: '/rms/orders', keys: ['pos', 'tables'] },
  { prefix: '/rms', keys: ['pos', 'tables', 'menu'] },
  { prefix: '/hrms/payroll', keys: ['payroll', 'people'] },
  { prefix: '/hrms', keys: ['people', 'payroll'] },
  { prefix: '/pos', keys: ['items', 'pos'] }, // retail POS = Inventory (or POS)
  { prefix: '/ims', keys: ['items', 'goods-in'] },
  { prefix: '/inventory', keys: ['items'] },
  { prefix: '/sales', keys: ['customers', 'invoicing'] },
  { prefix: '/accounting', keys: ['books', 'insights'] },
  { prefix: '/settings/categories', keys: ['items'] },
  { prefix: '/settings/uoms', keys: ['items'] },
  { prefix: '/settings/allocation-method', keys: ['items', 'pos'] },
];

/**
 * The app keys a route requires, or null when the route is always allowed
 * (dashboard, generic settings, profile, employee self-service, app launcher).
 */
export function requiredAppKeys(pathname: string): string[] | null {
  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
  return rule ? rule.keys : null;
}

/**
 * Whether the current tenant may view a route.
 * - effectiveApps === null → allow (legacy tenants / still loading — fail-open,
 *   matching the backend's null-enabledApps behavior).
 * - route has no app requirement → allow.
 * - otherwise allow when the tenant has ANY of the route's keys.
 */
export function isPathAllowed(pathname: string, effectiveApps: string[] | null): boolean {
  if (!effectiveApps) return true;
  const keys = requiredAppKeys(pathname);
  if (!keys) return true;
  return keys.some((k) => effectiveApps.includes(k));
}
