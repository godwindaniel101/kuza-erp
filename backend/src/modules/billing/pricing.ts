/**
 * À-la-carte pricing engine (founder direction, 2026-07).
 *
 * Free = a time-limited trial only (no base fee). After the trial a tenant pays
 * ONLY for what they use:
 *   - each VERTICAL / COMMON app they keep (assists are free), plus
 *   - usage add-ons: branches and users beyond the included allowance.
 *
 * This is a pure computation layer — it charges nothing. The numbers below are
 * DEFAULTS anchored off the existing plan tiers (local-first, not FX
 * conversions); they are meant to be tuned (eventually super-admin editable).
 * Assists (ai, market) are intentionally 0 — not directly payable.
 */
import { APP_KEYS, getApp } from '../../common/apps/app-registry';

export const PRICING_CURRENCIES = [
  'NGN',
  'GHS',
  'KES',
  'XOF',
  'USD',
  'GBP',
  'EUR',
] as const;
export type PricingCurrency = (typeof PRICING_CURRENCIES)[number];

type PriceMap = Record<string, number>;

/** Monthly price per app, per currency. Assists are free (all zero). */
export const APP_PRICES: Record<string, PriceMap> = {
  items: { NGN: 15000, GHS: 150, KES: 1500, XOF: 6000, USD: 10, GBP: 9, EUR: 9 },
  rms: { NGN: 15000, GHS: 150, KES: 1500, XOF: 6000, USD: 10, GBP: 9, EUR: 9 },
  people: { NGN: 12000, GHS: 120, KES: 1200, XOF: 4800, USD: 8, GBP: 7, EUR: 7 },
  books: { NGN: 10000, GHS: 105, KES: 1000, XOF: 4200, USD: 7, GBP: 6, EUR: 6 },
  invoicing: { NGN: 7500, GHS: 75, KES: 750, XOF: 3000, USD: 5, GBP: 4, EUR: 5 },
  payments: { NGN: 6000, GHS: 60, KES: 600, XOF: 2400, USD: 4, GBP: 3, EUR: 4 },
  ai: { NGN: 0, GHS: 0, KES: 0, XOF: 0, USD: 0, GBP: 0, EUR: 0 },
  market: { NGN: 0, GHS: 0, KES: 0, XOF: 0, USD: 0, GBP: 0, EUR: 0 },
};

/** Monthly price per usage add-on unit, per currency. */
export const USAGE_PRICES: { branch: PriceMap; user: PriceMap } = {
  branch: { NGN: 9000, GHS: 90, KES: 900, XOF: 3600, USD: 6, GBP: 5, EUR: 6 },
  user: { NGN: 3000, GHS: 30, KES: 300, XOF: 1200, USD: 2, GBP: 2, EUR: 2 },
};

/** Allowance included before usage add-ons kick in. */
export const INCLUDED = { branches: 1, users: 3 };

/**
 * The full pricing configuration the engine reads. This is what the persisted
 * PricingConfig row (landlord DB) supplies at runtime; when unseeded, the code
 * constants above are used via DEFAULT_PRICING so nothing breaks.
 */
export interface PricingConfigData {
  /** Monthly price per app, per currency. */
  appPrices: Record<string, PriceMap>;
  /** Monthly price per usage add-on unit, per currency. */
  usagePrices: { branch: PriceMap; user: PriceMap };
  /** Allowance included before usage add-ons kick in. */
  included: { branches: number; users: number };
}

/** Code defaults — the fallback when no persisted config exists. */
export const DEFAULT_PRICING: PricingConfigData = {
  appPrices: APP_PRICES,
  usagePrices: USAGE_PRICES,
  included: INCLUDED,
};

function normalizeCurrency(currency?: string): PricingCurrency {
  const c = (currency || 'NGN').toUpperCase();
  return (PRICING_CURRENCIES as readonly string[]).includes(c)
    ? (c as PricingCurrency)
    : 'USD';
}

/** Price in `currency`, falling back to USD then 0. */
function priceIn(map: PriceMap | undefined, currency: PricingCurrency): number {
  if (!map) return 0;
  const v = map[currency];
  return Number(v ?? map.USD ?? 0);
}

export interface QuoteInput {
  apps: string[];
  branches?: number;
  users?: number;
  currency?: string;
}

export interface QuoteLine {
  key: string;
  label: string;
  kind: 'app' | 'usage';
  qty: number;
  unit: number;
  amount: number;
}

export interface Quote {
  currency: PricingCurrency;
  lines: QuoteLine[];
  total: number;
  includedBranches: number;
  includedUsers: number;
}

/**
 * Compute an itemized monthly quote for a selection of apps + usage, in the
 * given currency. Unknown app keys are ignored; apps are returned in registry
 * order. Free apps (assists) still appear as £0 lines so the UI can show them.
 */
export function computeQuote(
  input: QuoteInput,
  config: PricingConfigData = DEFAULT_PRICING,
): Quote {
  const currency = normalizeCurrency(input.currency);
  const selected = new Set(input.apps || []);
  const lines: QuoteLine[] = [];

  for (const key of APP_KEYS) {
    if (!selected.has(key)) continue;
    const unit = priceIn(config.appPrices[key], currency);
    lines.push({
      key,
      label: getApp(key)?.name ?? key,
      kind: 'app',
      qty: 1,
      unit,
      amount: unit,
    });
  }

  const included = config.included;
  const branches = Math.max(0, Math.floor(input.branches ?? included.branches));
  const users = Math.max(0, Math.floor(input.users ?? included.users));
  const extraBranches = Math.max(0, branches - included.branches);
  const extraUsers = Math.max(0, users - included.users);

  if (extraBranches > 0) {
    const unit = priceIn(config.usagePrices.branch, currency);
    lines.push({
      key: 'branch',
      label: `Extra branches × ${extraBranches}`,
      kind: 'usage',
      qty: extraBranches,
      unit,
      amount: unit * extraBranches,
    });
  }
  if (extraUsers > 0) {
    const unit = priceIn(config.usagePrices.user, currency);
    lines.push({
      key: 'user',
      label: `Extra users × ${extraUsers}`,
      kind: 'usage',
      qty: extraUsers,
      unit,
      amount: unit * extraUsers,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return {
    currency,
    lines,
    total,
    includedBranches: included.branches,
    includedUsers: included.users,
  };
}

/**
 * The pricing catalog in a currency, for the UI to build the interactive
 * à-la-carte builder: per-app unit prices (with group), usage unit prices, and
 * the included allowance.
 */
export function pricingConfig(
  currency?: string,
  config: PricingConfigData = DEFAULT_PRICING,
) {
  const cur = normalizeCurrency(currency);
  return {
    currency: cur,
    includedBranches: config.included.branches,
    includedUsers: config.included.users,
    apps: APP_KEYS.map((key) => {
      const app = getApp(key);
      return {
        key,
        name: app?.name ?? key,
        group: app?.group ?? 'common',
        description: app?.description ?? '',
        exclusiveGroup: app?.exclusiveGroup ?? null,
        price: priceIn(config.appPrices[key], cur),
      };
    }),
    usage: {
      branch: priceIn(config.usagePrices.branch, cur),
      user: priceIn(config.usagePrices.user, cur),
    },
  };
}
