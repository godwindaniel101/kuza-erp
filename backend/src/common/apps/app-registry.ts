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
  | 'payments'
  | 'ai'
  | 'market';

/**
 * How an app is packaged (founder direction, 2026-07):
 *
 *  - 'vertical' — a primary, mutually-exclusive business surface. items
 *    (Inventory) and rms (Restaurant) share exclusiveGroup 'operations', so a
 *    business has at most one of them (just ims, just rms, or neither — never
 *    both). Future ops verticals (pharmacy, hospital, …) join the same group.
 *  - 'common'   — a functional app that can be subscribed to DIRECTLY on its
 *    own AND stacked on top of any vertical (People, Invoicing, Accounting,
 *    Payments). A business can run just a common (e.g. Accounting only), a
 *    vertical, or a vertical + several commons. Commons can host assists.
 *  - 'assist'   — NOT directly payable; it enhances a common/vertical and only
 *    functions when the tenant has at least one non-assist app (e.g. AI Assist,
 *    Marketplace).
 */
export type AppGroup = 'vertical' | 'common' | 'assist';

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
  /**
   * Packaging group — a directly-payable vertical, a cross-cutting common, or
   * a non-payable assist. See AppGroup.
   */
  group: AppGroup;
  /**
   * Verticals sharing the same exclusiveGroup are mutually exclusive — a
   * business may have at most one of them (e.g. items + rms share 'operations').
   * Undefined = no exclusivity (stacks freely).
   */
  exclusiveGroup?: string;
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
    group: 'vertical',
    exclusiveGroup: 'operations',
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
    // Not in the hospitality preset: a restaurant is the rms vertical and must
    // never get the standalone Inventory app (ims ⊕ rms). Retail/warehouse are
    // the Inventory verticals.
    defaultForBusinessTypes: ['retail', 'warehouse'],
  },
  {
    key: 'rms',
    name: 'Restaurant',
    group: 'vertical',
    exclusiveGroup: 'operations',
    description: 'Sell, plus dine-in tables, menus and a free QR menu',
    backendModules: ['rms/orders', 'rms/tables', 'rms/menus', 'rms/reservations', 'menu-sites'],
    // No dependency on 'items': Restaurant and Inventory are mutually-exclusive
    // verticals. Restaurant uses the shared STOCK CORE (not the Inventory app) —
    // the stock-core controllers are gated @RequireApp('items','rms') so a
    // restaurant reaches them via rms without ever enabling the Inventory app.
    dependencies: [],
    defaultForBusinessTypes: ['hospitality'],
  },
  {
    key: 'invoicing',
    name: 'Invoicing',
    group: 'common',
    description: 'Customers, invoices and getting paid — AR tracked automatically',
    backendModules: ['invoicing', 'customers'],
    dependencies: [],
    defaultForBusinessTypes: ['hospitality', 'accounts', 'retail'],
  },
  {
    key: 'books',
    name: 'Accounting',
    group: 'common',
    description:
      'Double-entry accounting that writes itself — no accountant required',
    backendModules: ['accounting'],
    dependencies: [],
    defaultForBusinessTypes: ['accounts', 'retail'],
  },
  {
    key: 'payments',
    name: 'Payments',
    group: 'common',
    description:
      'Take payments (bank transfer, card, mobile money) and tie them to sales in real time',
    backendModules: ['payments'],
    dependencies: [],
    defaultForBusinessTypes: ['hospitality', 'retail', 'accounts'],
  },
  {
    key: 'people',
    name: 'People',
    group: 'common',
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
  {
    key: 'ai',
    name: 'AI Assist',
    group: 'assist',
    description:
      'Kuza Copilot — ask questions of your data and get charts, summaries and insights on demand',
    backendModules: ['insights'],
    dependencies: [],
    // Assist: not directly payable, enabled on top of a vertical/common — never
    // part of a registration preset.
    defaultForBusinessTypes: [],
  },
  {
    key: 'market',
    name: 'Marketplace',
    group: 'assist',
    description:
      'Buy and sell across the Kuza supplier network — sourcing and B2B orders tied to your stock',
    backendModules: ['marketplace'],
    // Scoped to Inventory for now (assist attaches to the items vertical); it
    // opens up to more verticals as modules are added. Free even when enabled —
    // no charge is attached at pricing time.
    dependencies: ['items'],
    defaultForBusinessTypes: [],
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

// ---------------------------------------------------------------------------
// Verticals vs commons (packaging model — see AppGroup).
// ---------------------------------------------------------------------------

/** The vertical apps (mutually-exclusive business types), in registry order. */
export function verticalApps(): AppKey[] {
  return APP_REGISTRY.filter((app) => app.group === 'vertical').map((a) => a.key);
}

/** The common apps (cross-cutting, serve any vertical), registry order. */
export function commonApps(): AppKey[] {
  return APP_REGISTRY.filter((app) => app.group === 'common').map((a) => a.key);
}

/** The assist apps (not directly payable; enhance a vertical/common). */
export function assistApps(): AppKey[] {
  return APP_REGISTRY.filter((app) => app.group === 'assist').map((a) => a.key);
}

/** True if the key is a vertical app. Unknown keys are not verticals. */
export function isVertical(key: string): boolean {
  return getApp(key)?.group === 'vertical';
}

/** True if the key is an assist app (not directly payable). */
export function isAssist(key: string): boolean {
  return getApp(key)?.group === 'assist';
}

/**
 * Given the app the caller wants to enable, return the already-enabled apps it
 * would CONFLICT with under exclusivity (same exclusiveGroup, different key) —
 * e.g. enabling 'rms' when 'items' is on returns ['items']. Empty = no clash.
 */
export function exclusiveConflicts(
  key: string,
  enabledKeys: string[],
): AppKey[] {
  const app = getApp(key);
  if (!app?.exclusiveGroup) return [];
  const enabled = new Set(enabledKeys);
  return APP_REGISTRY.filter(
    (a) =>
      a.key !== app.key &&
      a.exclusiveGroup === app.exclusiveGroup &&
      enabled.has(a.key),
  ).map((a) => a.key);
}

/**
 * The single vertical app a business type maps to (its primary product
 * surface). Derived from the registration presets: a preset always contains
 * exactly one vertical today. Falls back to 'items' (Inventory) for
 * edition/legacy values whose preset has no vertical (e.g. accounts, hr) until
 * a dedicated vertical exists for them.
 */
export function verticalForBusinessType(businessType?: string | null): AppKey {
  const preset = presetForBusinessType(businessType);
  const vertical = preset.find((key) => isVertical(key));
  return vertical ?? 'items';
}
