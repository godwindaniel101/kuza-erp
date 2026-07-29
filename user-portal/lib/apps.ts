/**
 * Client-side copy of the canonical app registry (docs/APPS-MODEL.md §1–2).
 * The backend registry (`GET /billing/apps`) is authoritative at runtime;
 * this mirror powers registration (before a tenant exists), the sidebar
 * fallback, and icon/name/one-liner display.
 */
import { IconName } from '@/components/ui/Icon';
import type { BusinessType } from '@/store/globalStore';

export type AppKey =
  | 'items'
  | 'rms'
  | 'invoicing'
  | 'books'
  | 'people';

export interface AppDefinition {
  key: AppKey;
  name: string;
  /** One-line value prop from the registry. */
  description: string;
  icon: IconName;
  /** App keys that must be enabled for this app to work. */
  dependencies: AppKey[];
  /** Where the launcher / sidebar sends you for this app. */
  homeRoute: string;
}

/** Registry order is display order everywhere (launcher, apps page, registration). */
export const APP_REGISTRY: AppDefinition[] = [
  {
    key: 'items',
    name: 'Inventory',
    description: 'Catalog, stock, receiving and valuation — one source of truth across branches',
    icon: 'cube',
    dependencies: [],
    homeRoute: '/ims',
  },
  {
    key: 'rms',
    name: 'Restaurant',
    description: 'Sell, plus dine-in tables, menus and a free QR menu',
    icon: 'table-cells',
    dependencies: ['items'],
    homeRoute: '/',
  },
  {
    key: 'invoicing',
    name: 'Invoicing',
    description: 'Customers, invoices and getting paid — AR tracked automatically',
    icon: 'document-text',
    dependencies: [],
    homeRoute: '/sales',
  },
  {
    key: 'books',
    name: 'Accounting',
    description: 'Double-entry accounting that writes itself — no accountant required',
    icon: 'calculator',
    dependencies: [],
    homeRoute: '/accounting',
  },
  {
    key: 'people',
    name: 'People',
    description: 'Employees, attendance, leave and payroll in one place',
    icon: 'briefcase',
    dependencies: [],
    homeRoute: '/hrms/dashboard',
  },
];

export const APP_KEYS: AppKey[] = APP_REGISTRY.map((a) => a.key);

const registryByKey = new Map<string, AppDefinition>(APP_REGISTRY.map((a) => [a.key, a]));

export function getApp(key: string): AppDefinition | undefined {
  return registryByKey.get(key);
}

/**
 * Vertical presets — the minimum honest set per edition
 * (docs/APPS-MODEL.md §2). The five product editions are hospitality /
 * accounts / retail / hr / warehouse; legacy business types (restaurant,
 * services, general) keep working for existing tenants.
 */
export const VERTICAL_PRESETS: Record<BusinessType, AppKey[]> = {
  // Current editions
  hospitality: ['items', 'rms', 'invoicing'],
  accounts: ['books', 'invoicing'],
  retail: ['items', 'invoicing', 'books'],
  hr: ['people'],
  warehouse: ['items'],
  // Legacy business types
  restaurant: ['items', 'rms', 'books'],
  services: ['invoicing', 'books', 'people'],
  general: ['items', 'invoicing', 'books'],
};

export function presetFor(businessType: BusinessType | null | undefined): AppKey[] {
  return VERTICAL_PRESETS[businessType ?? 'general'] ?? VERTICAL_PRESETS.general;
}

/**
 * Expand a selection to include every (transitive) dependency,
 * returned in registry order with duplicates removed.
 */
export function withDependencies(keys: string[]): AppKey[] {
  const selected = new Set<AppKey>();
  const add = (key: string) => {
    const app = registryByKey.get(key);
    if (!app || selected.has(app.key)) return;
    selected.add(app.key);
    app.dependencies.forEach(add);
  };
  keys.forEach(add);
  return APP_KEYS.filter((k) => selected.has(k));
}

/** Dependencies (transitive) of `key` that are missing from `enabled`. */
export function missingDependencies(key: string, enabled: string[]): AppKey[] {
  const closure = withDependencies([key]).filter((k) => k !== key);
  return closure.filter((k) => !enabled.includes(k));
}

/** Apps in `enabled` that (transitively) depend on `key`. */
export function enabledDependents(key: string, enabled: string[]): AppKey[] {
  return APP_KEYS.filter(
    (k) =>
      k !== key &&
      enabled.includes(k) &&
      withDependencies([k]).includes(key as AppKey),
  );
}
