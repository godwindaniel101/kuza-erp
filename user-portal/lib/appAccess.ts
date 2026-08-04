/**
 * Client-side app-access guard rails.
 *
 * Maps a route to the app-registry keys that grant access to it, and decides
 * whether the current tenant (by its effectiveApps) may view that route. This
 * mirrors the backend FeatureGateGuard so a user can't reach an app they don't
 * have just by typing the URL — the sidebar already hides it; this blocks it.
 *
 * Keys match backend/src/common/apps/app-registry.ts:
 *   items, pos, tables, menu, customers, invoicing, books, people
 */

interface RouteRule {
  /** Route prefix (most-specific first). */
  prefix: string;
  /** Any-of app keys that grant access. */
  keys: string[];
}

// Ordered most-specific first — the first matching prefix wins.
const ROUTE_RULES: RouteRule[] = [
  { prefix: '/rms/suppliers', keys: ['items', 'rms', 'shop'] }, // purchasing — reachable from every stock-owning vertical
  { prefix: '/rms/menus', keys: ['rms'] },
  { prefix: '/rms/reservations', keys: ['rms'] },
  { prefix: '/menu-studio', keys: ['rms'] },
  { prefix: '/rms/tables', keys: ['rms'] },
  { prefix: '/rms/orders', keys: ['rms', 'items'] },
  { prefix: '/rms', keys: ['rms', 'items'] },
  { prefix: '/hrms/payroll', keys: ['people'] },
  { prefix: '/hrms', keys: ['people'] },
  { prefix: '/payments', keys: ['payments'] },
  { prefix: '/storefront', keys: ['shop'] }, // Storefront (shop vertical)
  // Shop sells its live stock via the shared IMS/POS/catalog pages, so those
  // routes accept 'shop' in addition to 'items'.
  { prefix: '/pos', keys: ['items', 'rms', 'shop'] }, // retail POS = Inventory (or POS)
  { prefix: '/ims', keys: ['items', 'shop'] },
  { prefix: '/inventory', keys: ['items'] },
  { prefix: '/sales', keys: ['invoicing'] },
  { prefix: '/accounting', keys: ['books'] },
  { prefix: '/website', keys: ['website'] },
  { prefix: '/ai', keys: ['ai'] }, // AI assist — was fail-open (no rule) → reachable by URL without the app
  { prefix: '/settings/categories', keys: ['items', 'shop', 'rms'] },
  { prefix: '/settings/uoms', keys: ['items', 'shop', 'rms'] },
  { prefix: '/settings/allocation-method', keys: ['items', 'shop', 'rms'] },
];

/**
 * The app keys a route requires, or null when the route is always allowed
 * (dashboard, generic settings, profile, employee self-service, app launcher).
 */
export function requiredAppKeys(pathname: string): string[] | null {
  // Platform back-office (/admin) is super-admin-only and lives OUTSIDE the
  // tenant app model — it is never gated by a tenant's effectiveApps. Access is
  // enforced server-side on every /admin endpoint and client-side by the page's
  // super-admin guard.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null;
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
