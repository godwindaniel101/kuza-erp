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
  | 'goods-in'
  | 'pos'
  | 'tables'
  | 'menu'
  | 'kuza-menu'
  | 'customers'
  | 'invoicing'
  | 'books'
  | 'insights'
  | 'people'
  | 'payroll'
  | 'payments'
  | 'audit';

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
    name: 'Items',
    description:
      'Your catalog and stock, one source of truth across branches',
    backendModules: [
      'ims/inventory',
      'ims/stock-movements',
      'ims/adjustments',
      'ims/transfers',
      'ims/categories',
      'ims/uoms',
      'ims/uom-conversions',
    ],
    dependencies: [],
    defaultForBusinessTypes: ['hospitality', 'retail', 'warehouse'],
  },
  {
    key: 'goods-in',
    name: 'Goods In',
    description:
      'Receive stock and know exactly what arrived, from whom, at what cost',
    backendModules: ['ims/inflows', 'rms/suppliers'],
    dependencies: ['items'],
    defaultForBusinessTypes: ['hospitality', 'retail', 'warehouse'],
  },
  {
    key: 'pos',
    name: 'Point of Sale',
    description: 'Ring up sales; stock and books update themselves',
    backendModules: ['rms/orders'],
    dependencies: ['items'],
    defaultForBusinessTypes: ['hospitality', 'retail'],
  },
  {
    key: 'tables',
    name: 'Tables',
    description: 'Floor plan, table status, orders per table',
    backendModules: ['rms/tables'],
    dependencies: ['pos'],
    defaultForBusinessTypes: ['hospitality'],
  },
  {
    key: 'menu',
    name: 'Menu',
    description: 'Build and price menus from your items',
    backendModules: ['rms/menus'],
    dependencies: ['items'],
    defaultForBusinessTypes: ['hospitality'],
  },
  {
    key: 'kuza-menu',
    name: 'Kuza Menu',
    description: 'Free QR menu website for your customers',
    backendModules: ['menu-sites'],
    dependencies: ['menu'],
    defaultForBusinessTypes: ['hospitality'],
  },
  {
    key: 'customers',
    name: 'Customers',
    description: 'Who buys from you and who owes you',
    backendModules: ['customers'],
    dependencies: [],
    defaultForBusinessTypes: ['hospitality', 'accounts', 'retail'],
  },
  {
    key: 'invoicing',
    name: 'Invoicing',
    description: 'Send invoices, get paid, AR tracked automatically',
    backendModules: ['invoicing'],
    dependencies: ['customers'],
    defaultForBusinessTypes: ['hospitality', 'accounts', 'retail'],
  },
  {
    key: 'books',
    name: 'Books',
    description:
      'Double-entry accounting that writes itself — no accountant required',
    backendModules: ['accounting'],
    dependencies: [],
    defaultForBusinessTypes: ['accounts', 'retail'],
  },
  {
    key: 'insights',
    name: 'Insights',
    description:
      '"Did I make money today?" — plain-language daily answers',
    backendModules: ['insights', 'dashboard'],
    dependencies: ['books'],
    defaultForBusinessTypes: [
      'hospitality',
      'accounts',
      'retail',
      'hr',
      'warehouse',
    ],
  },
  {
    key: 'people',
    name: 'People',
    description: 'Employees, attendance, leave in one place',
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
    ],
    dependencies: [],
    defaultForBusinessTypes: ['hr'],
  },
  {
    key: 'payroll',
    name: 'Payroll',
    description: "Run payroll with your country's taxes (per country pack)",
    backendModules: ['hrms/payroll'],
    dependencies: ['people'],
    // D1: no preset enables payroll until country packs ship.
    defaultForBusinessTypes: [],
  },
  {
    key: 'payments',
    name: 'Payments',
    description:
      'Paystack/Monnify collection links; auto-reconciled into your books',
    backendModules: ['integrations'],
    dependencies: ['books'],
    defaultForBusinessTypes: ['accounts', 'retail'],
  },
  {
    key: 'audit',
    name: 'Audit Trail',
    description: 'Every action, by whom, forever (Enterprise)',
    backendModules: ['common/audit'],
    dependencies: [],
    defaultForBusinessTypes: ['warehouse'],
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
  ims: ['items', 'goods-in'],
  rms: ['pos', 'tables', 'menu', 'kuza-menu'],
  invoicing: ['invoicing', 'customers'],
  accounting: ['books', 'insights', 'payments'],
  hrms: ['people', 'payroll'],
  audit: ['audit'],
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
