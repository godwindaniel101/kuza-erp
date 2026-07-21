/**
 * Canonical app registry — the single vocabulary shared by plans
 * (plan.limits.modules), the FeatureGateGuard, the sidebar, and the launcher.
 *
 * Apps are packaging; cores are code (docs/APPS-MODEL.md §1). Each app is a
 * named bundle of routes + permissions + terminology over the shared cores.
 * Adding a key here requires no migration.
 */

export type AppKey =
  | 'items'
  | 'rms'
  | 'invoicing'
  | 'books'
  | 'people'
  | 'payments';

/**
 * Product editions offered at registration (founder direction, 2026-07):
 * Hospitality | Digital Accounts | Retail MS | Human Resource MS |
 * Warehouse MS. The edition is stored as Business.businessType and decides
 * the tenant's default apps (preset) and views.
 */
export const EDITION_KEYS = [
  'hospitality',
  'accounts',
  'retail',
  'hr',
  'warehouse',
] as const;
export type EditionKey = (typeof EDITION_KEYS)[number];

/**
 * Legacy businessType values still accepted at registration, mapped to the
 * canonical edition stored on the Business. 'general' had a balanced preset;
 * 'retail' is its balanced successor.
 */
export const LEGACY_BUSINESS_TYPE_TO_EDITION: Record<string, EditionKey> = {
  restaurant: 'hospitality',
  services: 'accounts',
  general: 'retail',
};

/**
 * Normalize any accepted businessType (canonical edition or legacy value)
 * to its canonical edition. Unknown/missing values fall back to 'retail'
 * (the balanced legacy default, matching the old 'general' behavior).
 */
export function normalizeBusinessType(
  businessType?: string | null,
): EditionKey {
  if (
    businessType &&
    (EDITION_KEYS as readonly string[]).includes(businessType)
  ) {
    return businessType as EditionKey;
  }
  return LEGACY_BUSINESS_TYPE_TO_EDITION[businessType ?? ''] ?? 'retail';
}

export interface AppDefinition {
  key: AppKey;
  /** Display name (pre-terminology-skin). */
  name: string;
  /** One-line value prop, straight from the registry table. */
  description: string;
  /** Backend modules this app owns (informational; used by tooling/docs). */
  backendModules: string[];
  /** Direct dependencies (other app keys that must be enabled too). */
  dependencies: AppKey[];
  /**
   * Canonical editions whose registration preset enables this app by
   * default (legacy businessType values are normalized first — see
   * normalizeBusinessType).
   */
  defaultForBusinessTypes: string[];
}

export const APP_REGISTRY: readonly AppDefinition[] = [
  {
    key: 'items',
    name: 'Inventory',
    description:
      'Catalog, stock, receiving and valuation — one source of truth across branches',
    backendModules: [
      'ims/inventory',
      'ims/stock-movements',
      'ims/adjustments',
      'ims/transfers',
      'ims/categories',
      'ims/uoms',
      'ims/uom-conversions',
      'ims/inflows',
      'rms/suppliers',
    ],
    dependencies: [],
    defaultForBusinessTypes: ['hospitality', 'retail', 'warehouse'],
  },
  {
    key: 'rms',
    name: 'Restaurant',
    description: 'Sell, plus dine-in tables, menus and a free QR menu',
    backendModules: ['rms/orders', 'rms/tables', 'rms/menus', 'rms/reservations', 'menu-sites'],
    dependencies: ['items'],
    defaultForBusinessTypes: ['hospitality'],
  },
  {
    key: 'invoicing',
    name: 'Invoicing',
    description: 'Customers, invoices and getting paid — AR tracked automatically',
    backendModules: ['invoicing', 'customers'],
    dependencies: [],
    defaultForBusinessTypes: ['hospitality', 'accounts', 'retail'],
  },
  {
    key: 'books',
    name: 'Accounting',
    description:
      'Double-entry accounting that writes itself — no accountant required',
    backendModules: ['accounting'],
    dependencies: [],
    defaultForBusinessTypes: ['accounts', 'retail'],
  },
  {
    key: 'payments',
    name: 'Payments',
    description:
      'Take payments (bank transfer, card, mobile money) and tie them to sales in real time',
    backendModules: ['payments'],
    dependencies: [],
    defaultForBusinessTypes: ['hospitality', 'retail', 'accounts'],
  },
  {
    key: 'people',
    name: 'People',
    description: 'Employees, attendance, leave and payroll in one place',
    backendModules: [
      'hrms/employees',
      'hrms/attendance',
      'hrms/leaves',
      'hrms/leave-types',
      'hrms/departments',
      'hrms/positions',
      'hrms/locations',
      'hrms/recruitment',
      'hrms/performance',
      'hrms/learning',
      'hrms/benefits',
      'hrms/compensation',
      'hrms/payroll',
    ],
    dependencies: [],
    defaultForBusinessTypes: ['hr'],
  },
];

export const APP_KEYS: AppKey[] = APP_REGISTRY.map((app) => app.key);

const APPS_BY_KEY = new Map<string, AppDefinition>(
  APP_REGISTRY.map((app) => [app.key, app]),
);

export function getApp(key: string): AppDefinition | undefined {
  return APPS_BY_KEY.get(key);
}

/**
 * Legacy plan module keys → canonical app keys, applied at read time so plan
 * seeds need no data migration (APPS-MODEL.md §1 notes).
 */
export const LEGACY_PLAN_MODULE_TO_APPS: Record<string, AppKey[]> = {
  ims: ['items'],
  rms: ['rms'],
  invoicing: ['invoicing'],
  accounting: ['books'],
  hrms: ['people'],
};

/**
 * Map a plan's limits.modules (legacy keys, canonical keys, or a mix) to the
 * canonical app keys the plan allows. Returned in registry order.
 */
export function appsForPlanModules(modules: string[]): AppKey[] {
  const allowed = new Set<AppKey>();
  for (const module of modules || []) {
    const legacy = LEGACY_PLAN_MODULE_TO_APPS[module];
    if (legacy) {
      legacy.forEach((key) => allowed.add(key));
    }
    const direct = APPS_BY_KEY.get(module);
    if (direct) {
      allowed.add(direct.key);
    }
  }
  return APP_KEYS.filter((key) => allowed.has(key));
}

/**
 * Expand a set of app keys to include their full dependency closure
 * (e.g. ['tables'] → ['items','pos','tables']). Unknown keys are dropped.
 * Returned in registry order.
 */
export function expandDependencies(keys: string[]): AppKey[] {
  const result = new Set<AppKey>();
  const queue = (keys || []).filter((key): key is AppKey =>
    APPS_BY_KEY.has(key),
  );
  while (queue.length > 0) {
    const key = queue.pop() as AppKey;
    if (result.has(key)) {
      continue;
    }
    result.add(key);
    const app = APPS_BY_KEY.get(key);
    if (app) {
      queue.push(...app.dependencies);
    }
  }
  return APP_KEYS.filter((key) => result.has(key));
}

/**
 * Apps directly depending on the given app (used to block disabling an app
 * that others still need). Returned in registry order.
 */
export function dependentsOf(key: string): AppKey[] {
  return APP_REGISTRY.filter((app) =>
    app.dependencies.includes(key as AppKey),
  ).map((app) => app.key);
}

/**
 * Registration preset for a business type (APPS-MODEL.md §2). Presets are the
 * minimum honest set — everything else is one toggle away. Legacy values
 * ('restaurant', 'services', 'general') and unknown/missing values are
 * normalized to a canonical edition first (see normalizeBusinessType).
 */
export function presetForBusinessType(businessType?: string | null): AppKey[] {
  const edition = normalizeBusinessType(businessType);
  return APP_REGISTRY.filter((app) =>
    app.defaultForBusinessTypes.includes(edition),
  ).map((app) => app.key);
}
