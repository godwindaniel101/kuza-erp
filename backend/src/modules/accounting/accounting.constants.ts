import { AccountType } from './entities/account.entity';

/**
 * Stable codes for the seeded system chart. PostingService resolves these by
 * code, so they must never change once tenants exist.
 */
export const ACCOUNT_CODES = {
  CASH_ON_HAND: '1000',
  BANK: '1010',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY: '1200',
  FIXED_ASSETS: '1500',
  ACCUMULATED_DEPRECIATION: '1510',
  ACCOUNTS_PAYABLE: '2000',
  TAX_PAYABLE: '2100',
  WAGES_PAYABLE: '2200',
  OWNERS_EQUITY: '3000',
  RETAINED_EARNINGS: '3100',
  SALES_REVENUE: '4000',
  OTHER_INCOME: '4100',
  COST_OF_GOODS_SOLD: '5000',
  WAGE_EXPENSE: '6000',
  RENT_EXPENSE: '6100',
  UTILITIES_EXPENSE: '6200',
  INVENTORY_ADJUSTMENT_EXPENSE: '6300',
  DEPRECIATION_EXPENSE: '6400',
  OTHER_EXPENSE: '6900',
} as const;

export interface SeedAccountDef {
  code: string;
  name: string;
  type: AccountType;
  description?: string;
}

/** Standard SME chart seeded for every new tenant. */
export const DEFAULT_CHART: SeedAccountDef[] = [
  { code: ACCOUNT_CODES.CASH_ON_HAND, name: 'Cash on Hand', type: 'ASSET' },
  { code: ACCOUNT_CODES.BANK, name: 'Bank', type: 'ASSET' },
  {
    code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    name: 'Accounts Receivable',
    type: 'ASSET',
  },
  { code: ACCOUNT_CODES.INVENTORY, name: 'Inventory', type: 'ASSET' },
  { code: ACCOUNT_CODES.FIXED_ASSETS, name: 'Fixed Assets', type: 'ASSET' },
  {
    code: ACCOUNT_CODES.ACCUMULATED_DEPRECIATION,
    name: 'Accumulated Depreciation',
    type: 'ASSET',
    description: 'Contra-asset; carries a credit balance.',
  },
  {
    code: ACCOUNT_CODES.ACCOUNTS_PAYABLE,
    name: 'Accounts Payable',
    type: 'LIABILITY',
  },
  { code: ACCOUNT_CODES.TAX_PAYABLE, name: 'Tax Payable', type: 'LIABILITY' },
  {
    code: ACCOUNT_CODES.WAGES_PAYABLE,
    name: 'Wages Payable',
    type: 'LIABILITY',
  },
  { code: ACCOUNT_CODES.OWNERS_EQUITY, name: "Owner's Equity", type: 'EQUITY' },
  {
    code: ACCOUNT_CODES.RETAINED_EARNINGS,
    name: 'Retained Earnings',
    type: 'EQUITY',
  },
  { code: ACCOUNT_CODES.SALES_REVENUE, name: 'Sales Revenue', type: 'INCOME' },
  { code: ACCOUNT_CODES.OTHER_INCOME, name: 'Other Income', type: 'INCOME' },
  {
    code: ACCOUNT_CODES.COST_OF_GOODS_SOLD,
    name: 'Cost of Goods Sold',
    type: 'EXPENSE',
  },
  { code: ACCOUNT_CODES.WAGE_EXPENSE, name: 'Wage Expense', type: 'EXPENSE' },
  { code: ACCOUNT_CODES.RENT_EXPENSE, name: 'Rent Expense', type: 'EXPENSE' },
  {
    code: ACCOUNT_CODES.UTILITIES_EXPENSE,
    name: 'Utilities Expense',
    type: 'EXPENSE',
  },
  {
    code: ACCOUNT_CODES.INVENTORY_ADJUSTMENT_EXPENSE,
    name: 'Inventory Adjustment Expense',
    type: 'EXPENSE',
  },
  {
    code: ACCOUNT_CODES.DEPRECIATION_EXPENSE,
    name: 'Depreciation Expense',
    type: 'EXPENSE',
  },
  { code: ACCOUNT_CODES.OTHER_EXPENSE, name: 'Other Expense', type: 'EXPENSE' },
];

/**
 * decimal(14,2) columns come back from TypeORM as strings; all balance math
 * is done in integer cents to avoid float drift.
 */
export function toCents(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) {
    return NaN;
  }
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}
