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
    name: 'Items',
    description: 'Your catalog and stock, one source of truth across branches',
    icon: 'cube',
    dependencies: [],
    homeRoute: '/ims/inventory',
  },
  {
    key: 'goods-in',
    name: 'Goods In',
    description: 'Receive stock and know exactly what arrived, from whom, at what cost',
    icon: 'inbox-arrow',
    dependencies: ['items'],
    homeRoute: '/ims/inflows',
  },
  {
    key: 'pos',
    name: 'Point of Sale',
    description: 'Ring up sales; stock and books update themselves',
    icon: 'receipt',
    dependencies: ['items'],
    homeRoute: '/rms/orders',
  },
  {
    key: 'tables',
    name: 'Tables',
    description: 'Floor plan, table status, orders per table',
    icon: 'table-cells',
    dependencies: ['pos'],
    homeRoute: '/rms/tables',
  },
  {
    key: 'menu',
    name: 'Menu',
    description: 'Build and price menus from your items',
    icon: 'menu-book',
    dependencies: ['items'],
    homeRoute: '/rms/menus',
  },
  {
    key: 'kuza-menu',
    name: 'Kuza Menu',
    description: 'Free QR menu website for your customers',
    icon: 'sparkles',
    dependencies: ['menu'],
    homeRoute: '/menu-studio',
  },
  {
    key: 'customers',
    name: 'Customers',
    description: 'Who buys from you and who owes you',
    icon: 'users',
    dependencies: [],
    homeRoute: '/sales/customers',
  },
  {
    key: 'invoicing',
    name: 'Invoicing',
    description: 'Send invoices, get paid, AR tracked automatically',
    icon: 'document-text',
    dependencies: ['customers'],
    homeRoute: '/sales/invoices',
  },
  {
    key: 'books',
    name: 'Books',
    description: 'Double-entry accounting that writes itself — no accountant required',
    icon: 'calculator',
    dependencies: [],
    homeRoute: '/accounting',
  },
  {
    key: 'insights',
    name: 'Insights',
    description: '"Did I make money today?" — plain-language daily answers',
    icon: 'chart-bar',
    dependencies: ['books'],
    homeRoute: '/',
  },
  {
    key: 'people',
    name: 'People',
    description: 'Employees, attendance, leave in one place',
    icon: 'briefcase',
    dependencies: [],
    homeRoute: '/hrms/dashboard',
  },
  {
    key: 'payroll',
    name: 'Payroll',
    description: "Run payroll with your country's taxes",
    icon: 'banknotes',
    dependencies: ['people'],
    homeRoute: '/hrms/payroll',
  },
  {
    key: 'payments',
    name: 'Payments',
    description: 'Paystack/Monnify collection links; auto-reconciled into your books',
    icon: 'credit-card',
    dependencies: ['books'],
    homeRoute: '/settings/integrations',
  },
  {
    key: 'audit',
    name: 'Audit Trail',
    description: 'Every action, by whom, forever',
    icon: 'shield',
    dependencies: [],
    homeRoute: '/settings/audit',
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
  hospitality: ['items', 'goods-in', 'pos', 'tables', 'menu', 'kuza-menu', 'customers', 'invoicing', 'insights'],
  accounts: ['books', 'invoicing', 'customers', 'payments', 'insights'],
  retail: ['items', 'goods-in', 'pos', 'customers', 'invoicing', 'books', 'payments', 'insights'],
  hr: ['people', 'insights'],
  warehouse: ['items', 'goods-in', 'audit', 'insights'],
  // Legacy business types
  restaurant: ['items', 'goods-in', 'pos', 'tables', 'menu', 'kuza-menu', 'books', 'insights'],
  services: ['customers', 'invoicing', 'books', 'insights', 'people', 'payments'],
  general: ['items', 'goods-in', 'customers', 'invoicing', 'books', 'insights', 'payments'],
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
