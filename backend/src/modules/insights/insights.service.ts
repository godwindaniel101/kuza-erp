import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { Business } from '../../common/entities/business.entity';
import { LlmService } from '../../common/ai/llm.service';
import {
  BranchScopeService,
  ScopeActor,
} from '../../common/branch-scope/branch-scope.service';
import { BillingService } from '../billing/billing.service';
import { AppKey, getApp } from '../../common/apps/app-registry';

/**
 * Read-only ask context threaded from the controller. `actor` drives branch
 * scoping (BranchScopeService); `tenantId` + `schemaName` drive the
 * subscription/effective-apps pre-check. All optional so the copilot still
 * works (unscoped, all-apps) when called without a request context, e.g. tests.
 */
export interface AskOptions {
  actor?: ScopeActor;
  tenantId?: string;
  schemaName?: string;
  /** Explicit branch id to scope to (from the UI). */
  branchId?: string;
}

/**
 * The resolved branch scope for a single ask:
 *  - `branchIds === null` → all branches the caller may see (unscoped);
 *  - `branchIds === []`   → caller is assigned to no branch (sees nothing);
 *  - `branchIds === [...]`→ scope to exactly these branches.
 * `label` is a human phrase for the prompt ("branch Lekki", "all branches").
 * `denied` is set when the caller asked about a branch they cannot access.
 */
interface ResolvedBranchScope {
  branchIds: string[] | null;
  label: string;
  denied?: string;
}

/**
 * "Accountant in your pocket": computes plain-language insights from data
 * the tenant already has (invoices, books, stock, orders).
 *
 * F7 schema quirk: NO relation loads/joins via TypeORM metadata. All reads
 * here are raw SQL with UNQUALIFIED snake_case table/column names so they
 * follow the tenant transaction's search_path.
 *
 * Every section is computed independently and degrades gracefully: if a
 * query fails (e.g. a table does not exist yet for this tenant), the
 * section returns an empty/zero shape instead of failing the request.
 */

export interface InsightHeadline {
  headline: string;
}

export interface InsightCard {
  id: string;
  type:
    | 'profit'
    | 'sales'
    | 'top_mover'
    | 'overdue_ar'
    | 'low_stock'
    | 'anomaly'
    | 'cash';
  title: string;
  /** Formatted headline figure, e.g. "₦1,250,000" or "+34%". */
  metric: string;
  /** Plain-language sentence. Numbers are computed in code; Claude only rephrases. */
  text: string;
  severity: 'info' | 'positive' | 'warning' | 'critical';
}

/** A single (label, value) point on a copilot chart. Values are real. */
export interface CopilotChartPoint {
  label: string;
  value: number;
}

/** The chart the copilot may attach to an answer. Points are code-computed. */
export interface CopilotChart {
  type: 'area' | 'bar' | 'line';
  title: string;
  points: CopilotChartPoint[];
}

/**
 * A pre-computed, named series the model may pick from. The model only ever
 * chooses the key + chart type — it never supplies the points, which are
 * filled in by the backend from real tenant figures.
 */
interface NamedSeries {
  title: string;
  type: 'area' | 'bar' | 'line';
  /** Short description shown to the model so it can pick the right series. */
  description: string;
  points: CopilotChartPoint[];
}

const CHART_TYPES = ['area', 'bar', 'line'] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  KES: 'KSh ',
  GHS: 'GH₵',
  ZAR: 'R',
};

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  /**
   * Per-tenant, per-day cache of the computed summary, keyed by
   * `${businessId}:${YYYY-MM-DD}`. In-memory only; a singleton service is
   * safe here because the key is scoped to the tenant's business id.
   */
  private readonly summaryCache = new Map<
    string,
    { cards: InsightCard[]; generatedAt: string; aiPhrased: boolean }
  >();

  constructor(
    // Any tenant-scoped repository works as a raw-SQL entry point: its
    // manager resolves to the request's pinned transaction connection,
    // so unqualified table names follow the tenant search_path.
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly llm: LlmService,
    private readonly i18n: I18nService,
    // Both modules are @Global, so these resolve without importing them here.
    private readonly branchScope: BranchScopeService,
    private readonly billing: BillingService,
  ) {}

  private async sql<T = any>(query: string, params: any[] = []): Promise<T[]> {
    return this.invoiceRepository.query(query, params);
  }

  /**
   * Translate a user-facing insight string. The active language is resolved
   * per-request by the nestjs-i18n resolver (Accept-Language header) via
   * I18nContext; when no request context is present it falls back to `en`.
   * Dynamic parts (money strings, counts, names) are passed as interpolation
   * args and are NOT translated.
   */
  private t(key: string, args?: Record<string, any>): string {
    const lang = I18nContext.current()?.lang;
    return this.i18n.translate(key, { lang, args });
  }

  private formatMoney(amount: number, currency: string): string {
    const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
    const rounded = Math.round(Number(amount) * 100) / 100;
    return `${symbol}${rounded.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  private monthRange(offset = 0): { start: string; end: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
    return { start: iso(start), end: iso(end) };
  }

  async getDigest() {
    const business = await this.safe(
      () => this.businessRepository.findOne({ where: {} }),
      null,
    );
    const currency = business?.currency || 'NGN';
    const businessName = business?.name || this.t('insights.yourBusiness');

    const [
      cashPosition,
      profitThisMonth,
      topDebtors,
      lowStock,
      salesTrend,
      overdue,
      topItems,
      employeeCount,
    ] = await Promise.all([
      this.safe(() => this.cashPosition(currency), {
        amount: 0,
        headline: this.t('insights.cash.unavailable'),
      }),
      this.safe(() => this.profitThisMonth(currency), {
        income: 0,
        expense: 0,
        profit: 0,
        headline: this.t('insights.profit.unavailable'),
      }),
      this.safe(() => this.topDebtors(currency), []),
      this.safe(() => this.lowStock(), []),
      this.safe(() => this.salesTrend(currency), {
        thisMonth: 0,
        lastMonth: 0,
        changePct: null as number | null,
        headline: this.t('insights.sales.unavailable'),
      }),
      this.safe(() => this.overdueTotal(currency), {
        amount: 0,
        count: 0,
        headline: this.t('insights.overdue.noOverdue'),
      }),
      this.safe(() => this.topItems(currency), []),
      this.safe(() => this.employeeCount(), 0),
    ]);

    return {
      businessName,
      currency,
      generatedAt: new Date().toISOString(),
      cashPosition,
      profitThisMonth,
      topDebtors,
      lowStock,
      salesTrend,
      overdueTotal: overdue,
      topItems,
      employeeCount,
    };
  }

  /**
   * Dashboard AI-insights cards — plain-language, tone-tagged, derived
   * deterministically from the computed digest (figures come from code; no
   * fabrication). Read-only advisory. Shape matches the frontend AiInsights.
   */
  async getSummary(): Promise<{
    insights: Array<{ title: string; body: string; tone: 'positive' | 'warning' | 'info'; metric?: string }>;
  }> {
    const [d, biz] = await Promise.all([
      this.getDigest(),
      this.getBusinessContext(),
    ]);
    const insights: Array<{ title: string; body: string; tone: 'positive' | 'warning' | 'info'; metric?: string }> = [];

    // Exactly two cards. Card 1 — "Profit & stock": profit this month merged with
    // the branch-aware low-stock nudge (previously two separate cards). Card 2 —
    // "Sales & cash": sales trend, cash position and money owed.

    // Card 1: Profit & stock.
    {
      const parts: string[] = [];
      if (d.profitThisMonth) parts.push(d.profitThisMonth.headline);
      const hasLowByBranch = biz.lowStockByBranch.length > 0;
      if (hasLowByBranch) {
        const top = biz.lowStockByBranch[0];
        const more = biz.lowStockByBranch.length - 1;
        parts.push(
          more > 0
            ? this.t('insights.lowStockByBranch.bodyMore', {
                item: top.item,
                branch: top.branch,
                stock: top.stock,
                minimum: top.minimum,
                count: more,
              })
            : this.t('insights.lowStockByBranch.bodyOne', {
                item: top.item,
                branch: top.branch,
                stock: top.stock,
                minimum: top.minimum,
              }),
        );
      }
      if (parts.length > 0) {
        insights.push({
          title: this.t('insights.profitStock.title'),
          body: parts.join(' • '),
          tone: hasLowByBranch
            ? 'warning'
            : (d.profitThisMonth?.profit ?? 0) >= 0
              ? 'positive'
              : 'warning',
        });
      }
    }

    // Card 2: Sales & cash.
    {
      const parts: string[] = [];
      if (d.salesTrend) parts.push(d.salesTrend.headline);
      if (d.cashPosition) parts.push(d.cashPosition.headline);
      const hasOverdue = !!(d.overdueTotal && (d.overdueTotal.amount ?? 0) > 0);
      if (hasOverdue) {
        parts.push(
          (Array.isArray(d.topDebtors) && d.topDebtors[0]?.headline) ||
            d.overdueTotal.headline,
        );
      }
      if (parts.length > 0) {
        insights.push({
          title: this.t('insights.salesCash.title'),
          body: parts.join(' • '),
          tone: hasOverdue
            ? 'warning'
            : (d.salesTrend?.changePct ?? 0) >= 0
              ? 'positive'
              : 'info',
        });
      }
    }

    return { insights };
  }

  private async safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.logger.warn(`Insight section failed: ${error?.message}`);
      return fallback;
    }
  }

  /** (a) Net debit balance of cash accounts 1000 + 1010 from POSTED entries. */
  private async cashPosition(currency: string) {
    const rows = await this.sql<{ balance: string }>(
      `SELECT COALESCE(SUM(l.debit - l.credit), 0) AS balance
         FROM accounting_journal_lines l
         JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
         JOIN accounting_accounts a ON a.id = l.account_id
        WHERE e.status = 'POSTED'
          AND a.code IN ('1000', '1010')`,
    );
    const amount = Number(rows[0]?.balance || 0);
    const headline =
      amount >= 0
        ? this.t('insights.cash.positive', {
            amount: this.formatMoney(amount, currency),
          })
        : this.t('insights.cash.overdrawn', {
            amount: this.formatMoney(Math.abs(amount), currency),
          });
    return { amount, headline };
  }

  /** (b) Income minus expenses posted this month. */
  private async profitThisMonth(currency: string) {
    const { start, end } = this.monthRange(0);
    const rows = await this.sql<{ income: string; expense: string }>(
      `SELECT
         COALESCE(SUM(CASE WHEN a.type = 'INCOME' THEN l.credit - l.debit ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN a.type = 'EXPENSE' THEN l.debit - l.credit ELSE 0 END), 0) AS expense
         FROM accounting_journal_lines l
         JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
         JOIN accounting_accounts a ON a.id = l.account_id
        WHERE e.status = 'POSTED'
          AND e.date >= $1 AND e.date < $2`,
      [start, end],
    );
    const income = Number(rows[0]?.income || 0);
    const expense = Number(rows[0]?.expense || 0);
    const profit = Math.round((income - expense) * 100) / 100;
    const headline =
      profit >= 0
        ? this.t('insights.profit.positive', {
            profit: this.formatMoney(profit, currency),
            earned: this.formatMoney(income, currency),
            spent: this.formatMoney(expense, currency),
          })
        : this.t('insights.profit.negative', {
            amount: this.formatMoney(Math.abs(profit), currency),
            earned: this.formatMoney(income, currency),
            spent: this.formatMoney(expense, currency),
          });
    return { income, expense, profit, headline };
  }

  /** (c) Top 5 customers by outstanding balance + days overdue of their oldest unpaid invoice. */
  private async topDebtors(currency: string) {
    const rows = await this.sql<{
      customer_id: string;
      name: string;
      outstanding: string;
      oldest_due_date: string;
      invoice_count: string;
    }>(
      `SELECT c.id AS customer_id,
              c.name,
              COALESCE(SUM(i.total - i.amount_paid), 0) AS outstanding,
              MIN(i.due_date) AS oldest_due_date,
              COUNT(*) AS invoice_count
         FROM invoices i
         JOIN customers c ON c.id = i.customer_id
        WHERE i.status IN ('SENT', 'PARTIALLY_PAID')
        GROUP BY c.id, c.name
       HAVING COALESCE(SUM(i.total - i.amount_paid), 0) > 0
        ORDER BY outstanding DESC
        LIMIT 5`,
    );

    const today = new Date();
    return rows.map((row) => {
      const outstanding = Number(row.outstanding || 0);
      const dueDate = row.oldest_due_date
        ? new Date(String(row.oldest_due_date))
        : null;
      const daysOverdue = dueDate
        ? Math.max(
            0,
            Math.floor(
              (today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000),
            ),
          )
        : 0;
      const headline =
        daysOverdue > 0
          ? this.t(
              daysOverdue === 1
                ? 'insights.debtor.lateOne'
                : 'insights.debtor.lateOther',
              {
                name: row.name,
                amount: this.formatMoney(outstanding, currency),
                days: daysOverdue,
              },
            )
          : this.t('insights.debtor.notDue', {
              name: row.name,
              amount: this.formatMoney(outstanding, currency),
            });
      return {
        customerId: row.customer_id,
        name: row.name,
        outstanding,
        daysOverdue,
        openInvoices: Number(row.invoice_count || 0),
        headline,
      };
    });
  }

  /** (d) Items at or below minimum stock (top 10 most urgent). */
  private async lowStock() {
    const rows = await this.sql<{
      id: string;
      name: string;
      current_stock: string;
      minimum_stock: string;
    }>(
      `SELECT id, name, current_stock, minimum_stock
         FROM inventory_items
        WHERE minimum_stock > 0
          AND current_stock <= minimum_stock
        ORDER BY (current_stock - minimum_stock) ASC
        LIMIT 10`,
    );
    return rows.map((row) => {
      const currentStock = Number(row.current_stock || 0);
      const minimumStock = Number(row.minimum_stock || 0);
      const headline =
        currentStock <= 0
          ? this.t('insights.lowStock.outOfStock', {
              name: row.name,
              minimum: minimumStock,
            })
          : this.t('insights.lowStock.below', {
              name: row.name,
              current: currentStock,
              minimum: minimumStock,
            });
      return { itemId: row.id, name: row.name, currentStock, minimumStock, headline };
    });
  }

  /** (e) Invoice + order revenue this month vs last month. */
  private async salesTrend(currency: string) {
    const thisMonth = this.monthRange(0);
    const lastMonth = this.monthRange(-1);

    const revenueFor = async (range: { start: string; end: string }) => {
      const invoiceRows = await this.sql<{ total: string }>(
        `SELECT COALESCE(SUM(total), 0) AS total
           FROM invoices
          WHERE status NOT IN ('DRAFT', 'VOID')
            AND issue_date >= $1 AND issue_date < $2`,
        [range.start, range.end],
      );
      let orderTotal = 0;
      try {
        const orderRows = await this.sql<{ total: string }>(
          `SELECT COALESCE(SUM(total_amount), 0) AS total
             FROM orders
            WHERE status <> 'cancelled'
              AND created_at >= $1 AND created_at < $2`,
          [range.start, range.end],
        );
        orderTotal = Number(orderRows[0]?.total || 0);
      } catch {
        // orders table may not exist for this tenant edition — invoices only.
      }
      return Number(invoiceRows[0]?.total || 0) + orderTotal;
    };

    const [current, previous] = await Promise.all([
      revenueFor(thisMonth),
      revenueFor(lastMonth),
    ]);

    let changePct: number | null = null;
    if (previous > 0) {
      changePct = Math.round(((current - previous) / previous) * 1000) / 10;
    }

    let headline: string;
    if (changePct === null) {
      headline =
        current > 0
          ? this.t('insights.sales.thisMonthOnly', {
              amount: this.formatMoney(current, currency),
            })
          : this.t('insights.sales.none');
    } else if (changePct >= 0) {
      headline = this.t('insights.sales.up', {
        pct: changePct,
        current: this.formatMoney(current, currency),
        previous: this.formatMoney(previous, currency),
      });
    } else {
      headline = this.t('insights.sales.down', {
        pct: Math.abs(changePct),
        current: this.formatMoney(current, currency),
        previous: this.formatMoney(previous, currency),
      });
    }

    return { thisMonth: current, lastMonth: previous, changePct, headline };
  }

  /** (f) Total unpaid amount on invoices past their due date. */
  private async overdueTotal(currency: string) {
    const rows = await this.sql<{ amount: string; count: string }>(
      `SELECT COALESCE(SUM(total - amount_paid), 0) AS amount,
              COUNT(*) AS count
         FROM invoices
        WHERE status IN ('SENT', 'PARTIALLY_PAID')
          AND due_date < CURRENT_DATE`,
    );
    const amount = Number(rows[0]?.amount || 0);
    const count = Number(rows[0]?.count || 0);
    const headline =
      count > 0
        ? this.t(
            count === 1
              ? 'insights.overdue.someOne'
              : 'insights.overdue.someOther',
            { amount: this.formatMoney(amount, currency), count },
          )
        : this.t('insights.overdue.none');
    return { amount, count, headline };
  }

  /** (g) Best-selling items this month by invoiced revenue (top 5). */
  private async topItems(currency: string) {
    const { start, end } = this.monthRange(0);
    const rows = await this.sql<{
      name: string;
      revenue: string;
      qty: string;
    }>(
      `SELECT l.description AS name,
              COALESCE(SUM(l.line_total), 0) AS revenue,
              COALESCE(SUM(l.quantity), 0) AS qty
         FROM invoice_lines l
         JOIN invoices i ON i.id = l.invoice_id
        WHERE i.status NOT IN ('DRAFT', 'VOID')
          AND i.issue_date >= $1 AND i.issue_date < $2
        GROUP BY l.description
       HAVING COALESCE(SUM(l.line_total), 0) > 0
        ORDER BY revenue DESC
        LIMIT 5`,
      [start, end],
    );
    return rows.map((row) => {
      const revenue = Number(row.revenue || 0);
      const qty = Number(row.qty || 0);
      return {
        name: row.name,
        revenue,
        quantity: qty,
        headline: this.t('insights.topItem.headline', {
          name: row.name,
          revenue: this.formatMoney(revenue, currency),
          qty,
        }),
      };
    });
  }

  /** (h) Count of active employees (0 if the HRMS tables are not present). */
  private async employeeCount(): Promise<number> {
    const rows = await this.sql<{ count: string }>(
      `SELECT COUNT(*) AS count FROM employees WHERE employment_status = 'active'`,
    );
    return Number(rows[0]?.count || 0);
  }

  /** Total posted expenses for a date range (used for anomaly detection). */
  private async expenseFor(range: {
    start: string;
    end: string;
  }): Promise<number> {
    const rows = await this.sql<{ expense: string }>(
      `SELECT COALESCE(SUM(CASE WHEN a.type = 'EXPENSE' THEN l.debit - l.credit ELSE 0 END), 0) AS expense
         FROM accounting_journal_lines l
         JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
         JOIN accounting_accounts a ON a.id = l.account_id
        WHERE e.status = 'POSTED'
          AND e.date >= $1 AND e.date < $2`,
      [range.start, range.end],
    );
    return Number(rows[0]?.expense || 0);
  }

  /** Invoiced sales revenue per day for the last `days` days (zero-filled). */
  private async salesByDay(days = 14): Promise<CopilotChartPoint[]> {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const start = new Date(end);
    start.setDate(end.getDate() - days);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;

    const rows = await this.sql<{ day: string; total: string }>(
      `SELECT to_char(issue_date, 'YYYY-MM-DD') AS day,
              COALESCE(SUM(total), 0) AS total
         FROM invoices
        WHERE status NOT IN ('DRAFT', 'VOID')
          AND issue_date >= $1 AND issue_date < $2
        GROUP BY to_char(issue_date, 'YYYY-MM-DD')`,
      [iso(start), iso(end)],
    );
    const byDay = new Map(
      rows.map((r) => [String(r.day).slice(0, 10), Number(r.total || 0)]),
    );

    const points: CopilotChartPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      points.push({ label, value: byDay.get(iso(d)) ?? 0 });
    }
    return points;
  }

  /**
   * Assemble the whitelist of named series the copilot may chart. Every point
   * comes from an already-computed digest figure (or the graceful salesByDay
   * query) — the model can only pick a key + type, never invent numbers. Only
   * series that actually have data are exposed.
   */
  private async buildSeries(
    digest: Awaited<ReturnType<InsightsService['getDigest']>>,
  ): Promise<Record<string, NamedSeries>> {
    const series: Record<string, NamedSeries> = {};

    // Confined to the copilot path (not the dashboard digest) to avoid an
    // extra query on every digest read; degrades to [] on any failure.
    const daily = await this.safe(() => this.salesByDay(), []);
    if (daily.some((p) => p.value > 0)) {
      series.sales_by_day = {
        title: 'Sales over the last 14 days',
        type: 'area',
        description: 'Daily invoiced sales revenue for the last 14 days',
        points: daily,
      };
    }

    const profit = digest.profitThisMonth;
    if (profit && ((profit.income ?? 0) > 0 || (profit.expense ?? 0) > 0)) {
      series.income_vs_expense = {
        title: 'Income vs expenses this month',
        type: 'bar',
        description: "This month's total income compared with total expenses",
        points: [
          { label: 'Income', value: Number(profit.income || 0) },
          { label: 'Expenses', value: Number(profit.expense || 0) },
        ],
      };
    }

    if (Array.isArray(digest.topItems) && digest.topItems.length > 0) {
      series.top_items = {
        title: 'Best-selling items this month',
        type: 'bar',
        description: 'Top items ranked by sales revenue this month',
        points: digest.topItems.map((i) => ({
          label: i.name,
          value: Number(i.revenue || 0),
        })),
      };
    }

    const trend = digest.salesTrend;
    if (trend && ((trend.thisMonth ?? 0) > 0 || (trend.lastMonth ?? 0) > 0)) {
      series.sales_month_comparison = {
        title: 'Sales: this month vs last month',
        type: 'bar',
        description: 'Total sales this month compared with last month',
        points: [
          { label: 'Last month', value: Number(trend.lastMonth || 0) },
          { label: 'This month', value: Number(trend.thisMonth || 0) },
        ],
      };
    }

    if (Array.isArray(digest.topDebtors) && digest.topDebtors.length > 0) {
      series.top_debtors = {
        title: 'Who owes you the most',
        type: 'bar',
        description: 'Customers ranked by outstanding (unpaid) balance',
        points: digest.topDebtors.map((d) => ({
          label: d.name,
          value: Number(d.outstanding || 0),
        })),
      };
    }

    if (Array.isArray(digest.lowStock) && digest.lowStock.length > 0) {
      series.low_stock = {
        title: 'Items low on stock',
        type: 'bar',
        description: 'Items at or below minimum stock (current quantity left)',
        points: digest.lowStock.map((i) => ({
          label: i.name,
          value: Number(i.currentStock || 0),
        })),
      };
    }

    return series;
  }

  /**
   * Best-effort JSON extraction from a model reply: tolerates ```json fences
   * and surrounding prose. Returns the parsed object, or null when the reply
   * is not JSON (in which case the caller treats the whole text as the answer).
   */
  private extractJson(text: string): any | null {
    if (!text) return null;
    let t = text.trim();
    const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) t = fenced[1].trim();
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first === -1 || last === -1 || last < first) return null;
    try {
      return JSON.parse(t.slice(first, last + 1));
    } catch {
      return null;
    }
  }

  /**
   * Validate the model's chart choice against the real series whitelist. The
   * model only supplies `seriesKey` (must match one we provided) and `type`;
   * the actual points always come from `series`, never the model. Returns
   * undefined for any unknown key / empty series so no chart is attached.
   */
  private resolveChart(
    chart: any,
    series: Record<string, NamedSeries>,
  ): CopilotChart | undefined {
    if (!chart || typeof chart !== 'object') return undefined;
    const key = typeof chart.seriesKey === 'string' ? chart.seriesKey : '';
    const chosen = series[key];
    if (!chosen || chosen.points.length === 0) return undefined;

    const type = CHART_TYPES.includes(chart.type) ? chart.type : chosen.type;
    const title =
      typeof chart.title === 'string' && chart.title.trim()
        ? chart.title.trim()
        : chosen.title;
    // Points are the code-computed figures — never anything from the model.
    return { type, title, points: chosen.points };
  }

  /** Friendly names for the app keys stored on Business.enabledApps. */
  private static readonly APP_NAMES: Record<string, string> = {
    items: 'Inventory',
    pos: 'Point of Sale',
    rms: 'Restaurant (tables & menus)',
    invoicing: 'Invoicing & Customers',
    books: 'Accounting',
    people: 'People (HR & payroll)',
  };

  /**
   * A broad, end-to-end snapshot of the business for the copilot: which apps are
   * enabled, branches with per-branch stock, low stock by branch, inventory and
   * restaurant totals. Combined with the financial digest this lets the AI
   * answer real questions ("how many branches", "what's low in branch X",
   * accounting, restaurant) and know when a feature's app is turned off.
   */
  /**
   * Build an ` AND <col> = ANY($n)` clause bound to `branchIds`, pushing the
   * bind value onto `params`. Returns '' (no filter) when unscoped (null).
   * An empty list ([] = caller assigned to no branch) yields a clause that
   * matches nothing, which is the correct "sees no branch data" behaviour.
   */
  private branchClause(
    branchIds: string[] | null,
    col: string,
    params: any[],
  ): string {
    if (branchIds === null) return '';
    params.push(branchIds);
    return ` AND ${col} = ANY($${params.length})`;
  }

  private async getBusinessContext(branchIds: string[] | null = null) {
    const business = await this.safe(
      () => this.businessRepository.findOne({ where: {} }),
      null,
    );
    const enabledKeys = business?.enabledApps ?? null; // null = all enabled
    const enabledApps = (enabledKeys ?? Object.keys(InsightsService.APP_NAMES)).map(
      (k) => InsightsService.APP_NAMES[k] || k,
    );

    const [
      branches,
      lowStockByBranch,
      itemTotals,
      tableCount,
      menuItemCount,
      topProductRows,
      topStaffRows,
    ] = await Promise.all([
        this.safe(() => {
          const params: any[] = [];
          const where = branchIds === null
            ? ''
            : `WHERE b.id = ANY($${(params.push(branchIds), params.length)})`;
          return this.sql<any>(
            `SELECT b.name AS branch,
                    COUNT(bi.id) FILTER (WHERE bi.current_stock > 0) AS in_stock_items,
                    COUNT(bi.id) FILTER (WHERE bi.minimum_stock > 0 AND bi.current_stock <= bi.minimum_stock) AS low_stock_items,
                    COALESCE(SUM(bi.current_stock * COALESCE(ii.unit_cost, 0)), 0) AS stock_value
             FROM branches b
             LEFT JOIN branch_inventory_items bi ON bi.branch_id = b.id
             LEFT JOIN inventory_items ii ON ii.id = bi.inventory_item_id
             ${where}
             GROUP BY b.id, b.name
             ORDER BY b.name`,
            params,
          );
        }, []),
        this.safe(() => {
          const params: any[] = [];
          const clause = this.branchClause(branchIds, 'b.id', params);
          return this.sql<any>(
            `SELECT ii.name AS item, b.name AS branch,
                    bi.current_stock AS stock, bi.minimum_stock AS minimum
             FROM branch_inventory_items bi
             JOIN branches b ON b.id = bi.branch_id
             JOIN inventory_items ii ON ii.id = bi.inventory_item_id
             WHERE bi.minimum_stock > 0 AND bi.current_stock <= bi.minimum_stock${clause}
             ORDER BY (bi.current_stock - bi.minimum_stock) ASC
             LIMIT 50`,
            params,
          );
        }, []),
        this.safe(
          () =>
            this.sql<any>(
              `SELECT COUNT(*) AS total_items,
                      COALESCE(SUM(current_stock * COALESCE(unit_cost, 0)), 0) AS stock_value
               FROM inventory_items`,
            ),
          [{ total_items: '0', stock_value: '0' }],
        ),
        this.safe(() => this.sql<any>(`SELECT COUNT(*) AS c FROM tables`), [
          { c: '0' },
        ]),
        this.safe(() => this.sql<any>(`SELECT COUNT(*) AS c FROM menu_items`), [
          { c: '0' },
        ]),
        // Best-selling products from POS/order sales (restaurants sell via
        // orders, not invoices — so this, not invoice-based topItems, is the
        // real "best performing product").
        this.safe(() => {
          const params: any[] = [];
          const clause = this.branchClause(branchIds, 'o.branch_id', params);
          return this.sql<any>(
            `SELECT ii.name AS product,
                    COALESCE(SUM(oi.quantity_base), 0) AS units,
                    COALESCE(SUM(oi.total_price), 0) AS revenue
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             JOIN inventory_items ii ON ii.id = oi.inventory_item_id
             WHERE o.status <> 'cancelled'${clause}
             GROUP BY ii.name
             ORDER BY revenue DESC
             LIMIT 10`,
            params,
          );
        }, []),
        // Best-performing staff: the user who rang up the most sales (orders).
        this.safe(() => {
          const params: any[] = [];
          const clause = this.branchClause(branchIds, 'o.branch_id', params);
          return this.sql<any>(
            `SELECT u.name AS staff,
                    COALESCE(SUM(o.total_amount), 0) AS revenue,
                    COUNT(*) AS orders
             FROM orders o
             JOIN users u ON u.id = o.user_id
             WHERE o.status <> 'cancelled'${clause}
             GROUP BY u.name
             ORDER BY revenue DESC
             LIMIT 5`,
            params,
          );
        }, []),
      ]);

    return {
      enabledApps,
      allAppsEnabled: enabledKeys === null,
      businessType: business?.businessType ?? null,
      topProducts: (topProductRows as any[]).map((r) => ({
        product: r.product,
        units: Number(r.units || 0),
        revenue: Number(r.revenue || 0),
      })),
      topStaff: (topStaffRows as any[]).map((r) => ({
        name: r.staff,
        revenue: Number(r.revenue || 0),
        orders: Number(r.orders || 0),
      })),
      branchCount: branches.length,
      branches: branches.map((b: any) => ({
        name: b.branch,
        itemsInStock: Number(b.in_stock_items || 0),
        lowStockItems: Number(b.low_stock_items || 0),
        stockValueAtCost: Number(b.stock_value || 0),
      })),
      lowStockByBranch: lowStockByBranch.map((r: any) => ({
        item: r.item,
        branch: r.branch,
        stock: Number(r.stock || 0),
        minimum: Number(r.minimum || 0),
      })),
      inventory: {
        totalItems: Number(itemTotals?.[0]?.total_items || 0),
        stockValueAtCost: Number(itemTotals?.[0]?.stock_value || 0),
      },
      restaurant: {
        tables: Number(tableCount?.[0]?.c || 0),
        menuItems: Number(menuItemCount?.[0]?.c || 0),
      },
    };
  }

  /**
   * Precomputed data tables the copilot can present (product × branch matrices).
   * The AI only chooses WHICH table to show (by key); the app supplies the real
   * rows here — the model never fabricates table data.
   */
  private async buildTables(
    branchIds: string[] | null = null,
  ): Promise<
    Record<
      string,
      { title: string; description: string; columns: string[]; rows: (string | number)[][] }
    >
  > {
    const tables: Record<
      string,
      { title: string; description: string; columns: string[]; rows: (string | number)[][] }
    > = {};
    const round = (n: number) => Math.round(Number(n || 0) * 100) / 100;

    // Sales per product per branch (units + revenue), pivoted into a matrix.
    const salesRows = await this.safe(() => {
      const params: any[] = [];
      const clause = this.branchClause(branchIds, 'o.branch_id', params);
      return this.sql<any>(
        `SELECT ii.name AS product, b.name AS branch,
                COALESCE(SUM(oi.quantity_base), 0) AS units,
                COALESCE(SUM(oi.total_price), 0) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN branches b ON b.id = o.branch_id
         JOIN inventory_items ii ON ii.id = oi.inventory_item_id
         WHERE o.status <> 'cancelled'${clause}
         GROUP BY ii.name, b.name`,
        params,
      );
    }, []);
    if (salesRows.length > 0) {
      const branches = [...new Set(salesRows.map((r: any) => r.branch).filter(Boolean))].sort();
      const products = [...new Set(salesRows.map((r: any) => r.product).filter(Boolean))];
      const units = new Map<string, number>();
      const revenue = new Map<string, number>();
      for (const r of salesRows) {
        units.set(`${r.product}||${r.branch}`, Number(r.units || 0));
        revenue.set(`${r.product}||${r.branch}`, Number(r.revenue || 0));
      }
      tables.salesRevenueByProductBranch = {
        title: 'Sales revenue by product and branch',
        description: 'Revenue for each product across every branch, with a total column',
        columns: ['Product', ...branches, 'Total'],
        rows: products.map((p) => {
          const cells = branches.map((b) => round(revenue.get(`${p}||${b}`) || 0));
          return [p, ...cells, round(cells.reduce((s, v) => s + v, 0))];
        }),
      };
      tables.salesUnitsByProductBranch = {
        title: 'Units sold by product and branch',
        description: 'Units sold for each product across every branch, with a total column',
        columns: ['Product', ...branches, 'Total'],
        rows: products.map((p) => {
          const cells = branches.map((b) => units.get(`${p}||${b}`) || 0);
          return [p, ...cells, cells.reduce((s, v) => s + v, 0)];
        }),
      };
    }

    // Current stock per product per branch.
    const stockRows = await this.safe(() => {
      const params: any[] = [];
      const clause = this.branchClause(branchIds, 'b.id', params);
      return this.sql<any>(
        `SELECT ii.name AS product, b.name AS branch, bi.current_stock AS stock
         FROM branch_inventory_items bi
         JOIN branches b ON b.id = bi.branch_id
         JOIN inventory_items ii ON ii.id = bi.inventory_item_id
         ${clause ? `WHERE 1=1${clause}` : ''}`,
        params,
      );
    }, []);
    if (stockRows.length > 0) {
      const branches = [...new Set(stockRows.map((r: any) => r.branch).filter(Boolean))].sort();
      const products = [...new Set(stockRows.map((r: any) => r.product).filter(Boolean))];
      const stock = new Map<string, number>();
      for (const r of stockRows) stock.set(`${r.product}||${r.branch}`, Number(r.stock || 0));
      tables.stockByProductBranch = {
        title: 'Current stock by product and branch',
        description: 'Current stock level for each product across every branch',
        columns: ['Product', ...branches],
        rows: products.map((p) => [p, ...branches.map((b) => stock.get(`${p}||${b}`) || 0)]),
      };
    }

    return tables;
  }

  /**
   * Deterministic answers for common, factual questions — computed from real
   * data so they're always correct and crisp, regardless of how weak the
   * underlying model is. Returns null to fall through to the LLM.
   */
  private quickAnswer(
    question: string,
    digest: Awaited<ReturnType<InsightsService['getDigest']>>,
    biz: Awaited<ReturnType<InsightsService['getBusinessContext']>>,
    tables: Awaited<ReturnType<InsightsService['buildTables']>>,
  ): { answer: string; table?: any } | null {
    const s = question.toLowerCase();
    const money = (n: number) => this.formatMoney(Number(n || 0), digest.currency);
    const revenueTable = tables.salesRevenueByProductBranch
      ? {
          title: 'Sales revenue by product and branch',
          columns: tables.salesRevenueByProductBranch.columns,
          rows: tables.salesRevenueByProductBranch.rows,
        }
      : undefined;

    // How do I optimize / grow / improve my sales? — specific, data-driven.
    if (
      /(optimi[sz]e|improve|grow|boost|increase|maximi[sz]e|drive|more)\b[^?.]*\b(sales|revenue|sell)/.test(s) ||
      /how (do|can|should) i sell more/.test(s)
    ) {
      const t = tables.salesRevenueByProductBranch;
      if (!t || t.rows.length === 0) {
        return {
          answer:
            "There are no sales yet to analyse. Once you start ringing up sales, I'll suggest specific ways to grow them.",
        };
      }
      const branchCols = t.columns.slice(1, -1); // drop 'Product' and 'Total'
      const totalIdx = t.columns.length - 1;
      const products = t.rows.map((r) => ({
        name: String(r[0]),
        byBranch: branchCols.map((_, i) => Number(r[i + 1] || 0)),
        total: Number(r[totalIdx] || 0),
      }));
      const branchTotals = branchCols.map((_, i) =>
        products.reduce((sum, p) => sum + p.byBranch[i], 0),
      );
      const ranked = [...products].sort((a, b) => b.total - a.total);
      const top = ranked[0];
      const recs: string[] = [];

      if (top && top.total > 0) {
        const topIdx = top.byBranch.indexOf(Math.max(...top.byBranch));
        const missing = branchCols.filter((_, i) => top.byBranch[i] === 0);
        recs.push(
          `**Lean into your winner.** ${top.name} is your top seller (${money(top.total)}), mostly at ${branchCols[topIdx] ?? 'your main branch'}.` +
            (missing.length
              ? ` It sells nothing at ${missing.join(', ')} — stock and promote it there to grow fast.`
              : ''),
        );
      }

      if (branchCols.length > 1) {
        const gaps = products
          .filter(
            (p) => p !== top && Math.max(...p.byBranch) > 0 && p.byBranch.some((v) => v === 0),
          )
          .sort((a, b) => Math.max(...b.byBranch) - Math.max(...a.byBranch))
          .slice(0, 2);
        gaps.forEach((p) => {
          const strong = branchCols[p.byBranch.indexOf(Math.max(...p.byBranch))];
          const weak = branchCols.filter((_, i) => p.byBranch[i] === 0);
          recs.push(
            `**Close a branch gap.** ${p.name} does ${money(Math.max(...p.byBranch))} at ${strong} but nothing at ${weak.join(', ')} — try it there.`,
          );
        });

        const bi = branchTotals.indexOf(Math.max(...branchTotals));
        const wi = branchTotals.indexOf(Math.min(...branchTotals));
        if (bi !== wi) {
          recs.push(
            `**Level up your weaker branch.** ${branchCols[bi]} (${money(branchTotals[bi])}) far outsells ${branchCols[wi]} (${money(branchTotals[wi])}). Copy what works at ${branchCols[bi]} — menu, pricing, upsells.`,
          );
        }
      }

      const slow = ranked.filter((p) => p.total > 0 && top && p.total < top.total * 0.05).slice(0, 3);
      if (slow.length) {
        recs.push(
          `**Trim the tail.** Slow movers (${slow.map((p) => p.name).join(', ')}) barely sell — bundle, promote, or drop them to focus on what works.`,
        );
      }

      if (recs.length === 0) {
        recs.push('Keep ringing up sales — once there is more history I can spot clearer opportunities.');
      }

      return {
        answer:
          `Here's how to grow sales, based on your real numbers:\n\n` +
          recs.map((r) => `• ${r}`).join('\n'),
        table: revenueTable,
      };
    }

    // Best / top performing STAFF (checked before product so "best performing
    // staff" isn't mistaken for a product question).
    if (/(best|top|highest)\b[^?.]*\b(staff|employee|cashier|waiter|team member|worker|salesperson|seller person)\b/.test(s)) {
      const st = biz.topStaff?.[0];
      if (!st || !st.revenue) {
        return {
          answer:
            'No staff sales are recorded yet, so I can\'t rank staff performance. Make sure sales are rung up under each staff member\'s login, then I can show your best performer.',
        };
      }
      return {
        answer: `Your best-performing staff member is ${st.name} — ${money(st.revenue)} in sales across ${st.orders.toLocaleString()} order${st.orders === 1 ? '' : 's'}.`,
      };
    }

    // Best / top performing BRANCH
    if (/(best|top|highest)\b[^?.]*\bbranch(es)?\b/.test(s)) {
      const t = tables.salesRevenueByProductBranch;
      const branchCols = t ? t.columns.slice(1, -1) : [];
      if (!t || branchCols.length === 0) {
        return { answer: "There are no branch sales recorded yet to compare." };
      }
      const totals = branchCols.map((_, i) =>
        t.rows.reduce((sum, r) => sum + Number(r[i + 1] || 0), 0),
      );
      const bi = totals.indexOf(Math.max(...totals));
      return {
        answer: `Your best-performing branch is ${branchCols[bi]} — ${money(totals[bi])} in sales.`,
        table: revenueTable,
      };
    }

    // Best / top / best-selling PRODUCT (requires a product noun — "performing"
    // alone no longer triggers this, so staff/branch questions don't fall here).
    if (
      /(best|top|highest|most)\b[^?.]*\b(product|item|dish|sku|seller|selling|sold)\b/.test(s) ||
      /\bwhat\b[^?.]*\b(sell|sold)\b[^?.]*\bmost\b/.test(s)
    ) {
      const tp = biz.topProducts?.[0];
      if (!tp || !tp.revenue) {
        return {
          answer:
            "You haven't recorded any sales yet, so there's no best-performing product. Once you ring up some sales, your top products will show here.",
        };
      }
      return {
        answer: `Your best-performing product is ${tp.product} — ${money(tp.revenue)} in sales${tp.units ? ` (${tp.units.toLocaleString()} sold)` : ''}.`,
        table: revenueTable,
      };
    }

    // How many branches
    if (/how many branch|number of branches|branches do i have|branch(es)? do i/.test(s)) {
      const names = biz.branches.map((b) => b.name).filter(Boolean);
      return {
        answer: `You have ${biz.branchCount} branch${biz.branchCount === 1 ? '' : 'es'}${
          names.length ? `: ${names.join(', ')}.` : '.'
        }`,
      };
    }

    // Low stock / what needs restocking
    if (/low stock|running low|restock|reorder|out of stock/.test(s)) {
      if (!biz.lowStockByBranch.length) {
        return {
          answer:
            'Nothing is below its reorder point right now — stock looks healthy across your branches.',
        };
      }
      const top = biz.lowStockByBranch
        .slice(0, 5)
        .map((r) => `${r.item} at ${r.branch} (${r.stock} left, reorder at ${r.minimum})`)
        .join('; ');
      return {
        answer: `${biz.lowStockByBranch.length} item(s) are low: ${top}${
          biz.lowStockByBranch.length > 5 ? ', and more.' : '.'
        }`,
        table: tables.stockByProductBranch
          ? {
              title: 'Current stock by product and branch',
              columns: tables.stockByProductBranch.columns,
              rows: tables.stockByProductBranch.rows,
            }
          : undefined,
      };
    }

    // Profit this month
    if (/\bprofit\b|did i make money|make money this month|am i profitable/.test(s)) {
      if (digest.profitThisMonth?.headline) {
        return { answer: digest.profitThisMonth.headline };
      }
    }

    return null;
  }

  /** Resolve the model's table choice to a real, code-computed table. */
  private resolveTable(
    raw: any,
    tables: Record<string, { title: string; columns: string[]; rows: (string | number)[][] }>,
  ): { title: string; columns: string[]; rows: (string | number)[][] } | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const key = typeof raw.tableKey === 'string' ? raw.tableKey : undefined;
    const t = key ? tables[key] : undefined;
    if (!t || t.rows.length === 0) return undefined;
    const title =
      typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : t.title;
    return { title, columns: t.columns, rows: t.rows };
  }

  /**
   * Cross-module workforce snapshot (People/HR + payroll) so the copilot can
   * answer HR questions and cross-module ones like "can I afford another
   * employee?" — which need headcount + payroll cost alongside cash/profit.
   * Every figure degrades to 0 when the People app's tables are absent.
   * Business-wide (not branch-scoped): HR is org-level, employees carry no
   * branch_id (only an optional location_id).
   */
  private async getWorkforceContext() {
    const [head, salaries, lastPayroll] = await Promise.all([
      this.safe(() => this.employeeCount(), 0),
      this.safe(
        () =>
          this.sql<any>(
            `SELECT COALESCE(SUM(gross_salary), 0) AS monthly_cost,
                    COALESCE(AVG(gross_salary), 0) AS avg_salary,
                    COUNT(*) AS on_payroll
             FROM employee_salaries
             WHERE is_active = true`,
          ),
        [{ monthly_cost: '0', avg_salary: '0', on_payroll: '0' }],
      ),
      this.safe(
        () =>
          this.sql<any>(
            `SELECT COALESCE(SUM(net_pay), 0) AS net, MAX(pay_date) AS last_pay_date
             FROM payrolls
             WHERE pay_period_start = (SELECT MAX(pay_period_start) FROM payrolls)`,
          ),
        [{ net: '0', last_pay_date: null }],
      ),
    ]);

    return {
      headcount: head,
      onPayroll: Number(salaries?.[0]?.on_payroll || 0),
      monthlyPayrollCost: Number(salaries?.[0]?.monthly_cost || 0),
      averageSalary: Number(salaries?.[0]?.avg_salary || 0),
      lastPayrollNet: Number(lastPayroll?.[0]?.net || 0),
      lastPayrollDate: lastPayroll?.[0]?.last_pay_date ?? null,
    };
  }

  /**
   * Map a question to the ONE app whose vocabulary it clearly needs, so the
   * copilot can tell the owner an app is off (D3) instead of hallucinating.
   * Deliberately conservative: only strongly app-specific phrasing matches, so
   * broad "how is my business doing" questions are never wrongly gated.
   */
  private requiredAppForQuestion(question: string): AppKey | null {
    const s = question.toLowerCase();
    const rules: Array<{ app: AppKey; re: RegExp }> = [
      { app: 'people', re: /\b(payroll|salar(y|ies)|employee|staff wage|headcount|hire|hiring|attendance|leave request|hr\b|human resource|wage bill)\b/ },
      { app: 'books', re: /\b(ledger|journal entry|balance sheet|trial balance|chart of accounts|profit and loss|p&l|income statement|reconcile|double.?entry|accounting)\b/ },
      { app: 'invoicing', re: /\b(invoice|receivable|debtor|who owes|money owed|unpaid bill|accounts receivable|\bar\b)\b/ },
      { app: 'rms', re: /\b(menu|dish|dine.?in|table reservation|waiter|kitchen|restaurant)\b/ },
      { app: 'payments', re: /\b(payment gateway|settlement|card payment|mobile money|payout|payment transaction)\b/ },
      { app: 'market', re: /\b(marketplace|supplier network|b2b order|sourcing)\b/ },
      { app: 'items', re: /\b(stock level|inventory|reorder|sku|warehouse|restock|out of stock)\b/ },
    ];
    for (const r of rules) if (r.re.test(s)) return r.app;
    return null;
  }

  /**
   * Resolve the branch scope for an ask, honouring BranchScopeService semantics
   * and inferring a branch from the question text when none is passed. Returns
   * `denied` when the caller asks about a branch outside their allowed set.
   */
  private async resolveBranchScope(
    opts: AskOptions,
    question: string,
  ): Promise<ResolvedBranchScope> {
    // allowed: null = all branches (admin/unscoped), [] = none, [...] = subset.
    const allowed = await this.safe(
      () => this.branchScope.allowedBranchIds(opts.actor),
      null,
    );

    // All branches the caller may see, for name matching + access checks.
    const params: any[] = [];
    const clause =
      allowed === null ? '' : `WHERE id = ANY($${(params.push(allowed), params.length)})`;
    const branches = await this.safe(
      () =>
        this.sql<{ id: string; name: string }>(
          `SELECT id, name FROM branches ${clause} ORDER BY name`,
          params,
        ),
      [],
    );
    const inAllowed = (id: string) => allowed === null || allowed.includes(id);

    // 1) Explicit branch id from the UI.
    if (opts.branchId) {
      const match = branches.find((b) => b.id === opts.branchId);
      if (!inAllowed(opts.branchId) || !match) {
        return {
          branchIds: allowed,
          label: allowed === null ? 'all branches' : 'your branches',
          denied: opts.branchId,
        };
      }
      return { branchIds: [match.id], label: `branch ${match.name}` };
    }

    // 2) Infer a branch mentioned by name in the question (word-boundary match).
    const q = question.toLowerCase();
    const named = branches.find(
      (b) => b.name && new RegExp(`\\b${this.escapeRegex(b.name.toLowerCase())}\\b`).test(q),
    );
    if (named) return { branchIds: [named.id], label: `branch ${named.name}` };

    // 3) General question — scope to everything the caller may see.
    return {
      branchIds: allowed,
      label: allowed === null ? 'all branches' : 'your assigned branches',
    };
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Effective apps (Business.enabledApps ∩ plan-allowed) via BillingService,
   * degrading to null (treat as "all enabled") when the tenant context is
   * missing or the lookup fails — the copilot must never hard-fail on this.
   */
  private async getEffectiveApps(opts: AskOptions): Promise<AppKey[] | null> {
    if (!opts.tenantId || !opts.schemaName) return null;
    return this.safe(
      () => this.billing.getEffectiveApps(opts.tenantId!, opts.schemaName!),
      null,
    );
  }

  /**
   * Kuza Copilot: answers a plain-language question using the full business
   * snapshot (financial digest + branches, stock, apps, workforce) as context,
   * scoped to the caller's allowed branches and aware of which apps are on.
   * Never throws — degraded states come back as { available: false, message }.
   */
  async ask(question: string, opts: AskOptions = {}) {
    // Effective apps (Business.enabledApps ∩ plan-allowed). null = unknown →
    // treat as "all enabled" so the copilot never hard-fails on billing.
    const effectiveApps = await this.getEffectiveApps(opts);

    // Subscription-awareness (D3): if the question clearly needs an app the
    // tenant is not subscribed to, say so helpfully instead of hallucinating.
    const requiredApp = this.requiredAppForQuestion(question);
    if (requiredApp) {
      if (effectiveApps !== null && !effectiveApps.includes(requiredApp)) {
        const name = getApp(requiredApp)?.name ?? requiredApp;
        return {
          available: true,
          answer:
            `That question needs the ${name} app, which isn't enabled for your business yet. ` +
            `You can turn it on under Settings → Apps (it may require a plan upgrade). ` +
            `Once ${name} is on, ask me again and I'll answer from your real data.`,
          requiresApp: requiredApp,
        };
      }
    }

    const scope = await this.resolveBranchScope(opts, question);

    const [digest, biz, tables, workforce] = await Promise.all([
      this.getDigest(),
      this.getBusinessContext(scope.branchIds),
      this.buildTables(scope.branchIds),
      this.getWorkforceContext(),
    ]);

    if (scope.denied) {
      return {
        available: true,
        answer:
          "You don't have access to that branch, so I can't show its figures. " +
          'Ask about a branch you are assigned to, or ask your admin for access.',
      };
    }

    // Deterministic, code-computed answers for common factual questions — always
    // correct and crisp, independent of the model's reasoning ability.
    const quick = this.quickAnswer(question, digest, biz, tables);
    if (quick) {
      const resp: any = { available: true, answer: quick.answer };
      if (quick.table) resp.table = quick.table;
      return resp;
    }

    const series = await this.buildSeries(digest);

    const seriesKeys = Object.keys(series);
    const seriesBlock = seriesKeys.length
      ? `Available chart series (use one of these EXACT keys as seriesKey, never invent one):\n${seriesKeys
          .map((k) => `- ${k} (${series[k].type}): ${series[k].description}`)
          .join('\n')}`
      : 'No chart series are available for this business right now — do not include a chart.';

    const tableKeys = Object.keys(tables);
    const tableBlock = tableKeys.length
      ? `Available data tables (use one of these EXACT keys as tableKey — the app fills the real rows, so NEVER write rows yourself):\n${tableKeys
          .map((k) => `- ${k}: ${tables[k].description}`)
          .join('\n')}`
      : 'No data tables are available right now — do not include a table.';

    // Cross-module affordability block (D2): everything the model needs to
    // reason about "can I afford another employee?" in one place — cash on
    // hand, this month's profit, current monthly payroll cost and average pay.
    const financialCapacity = {
      cashOnHand: digest.cashPosition?.amount ?? 0,
      profitThisMonth: digest.profitThisMonth?.profit ?? 0,
      monthlyPayrollCost: workforce.monthlyPayrollCost,
      averageSalaryPerEmployee: workforce.averageSalary,
      headcount: workforce.headcount,
    };

    // Effective apps drive the enabledApps line so the model matches D3's
    // pre-check; falls back to the Business.enabledApps display list.
    const effectiveAppNames =
      effectiveApps !== null
        ? effectiveApps.map((k) => getApp(k)?.name ?? k)
        : biz.enabledApps;

    const context = [
      `Business name: ${digest.businessName}`,
      `Business type/edition: ${biz.businessType ?? 'unknown'}`,
      `Currency: ${digest.currency}`,
      `Number of branches: ${biz.branchCount}`,
      `Scope of this answer: ${scope.label} (all money/finance figures below are business-wide; branches, per-branch stock, sales, top products/staff are limited to this scope).`,
      `Enabled apps (features currently turned ON): ${effectiveAppNames.join(', ')}${biz.allAppsEnabled && effectiveApps === null ? ' (all apps)' : ''}`,
      `Full business snapshot (JSON — financials, branches, per-branch stock, low stock, inventory, restaurant, workforce/HR & payroll, and a financialCapacity block for affordability questions):`,
      JSON.stringify({ ...digest, ...biz, workforce, financialCapacity }),
      '',
      seriesBlock,
      '',
      tableBlock,
    ].join('\n');

    // Provider-agnostic: LlmService picks the backend from AI_PROVIDER and
    // never throws — an unconfigured/unreachable/errored provider comes back
    // as { available: false } and we degrade to the "not configured" shape.
    const result = await this.llm.chat({
      system:
        'You are Kuza Copilot, the AI assistant inside Kuza ERP. You help the ' +
        'owner across their WHOLE business: inventory & stock (including per ' +
        'branch), sales, invoicing & customers, accounting/finance, restaurant ' +
        '(tables & menus) and people/HR. ' +
        'Answer ONLY from the provided business snapshot (JSON) — it contains the ' +
        'real figures: branch list and counts, per-branch stock and low-stock ' +
        'items, inventory totals, cash, profit, sales, debtors, and more. When ' +
        'asked "how many branches", "what is low in branch X", or similar, read ' +
        'the exact numbers from the snapshot and answer precisely. ' +
        'For cross-module questions like "can I afford to hire someone?", use the ' +
        '"financialCapacity" block (cash on hand, profit this month, current ' +
        'monthly payroll cost, average salary) and reason it through explicitly. ' +
        'For people/HR/payroll questions use the "workforce" block. Respect the ' +
        '"Scope of this answer" line: when scoped to a branch, do not claim to ' +
        'report other branches. ' +
        'The snapshot lists "enabledApps" — the features currently turned on. ' +
        'ONLY suggest enabling an app if it is genuinely missing from that list; ' +
        'if the relevant app is already enabled, never tell them to enable it. ' +
        'Never invent app or feature names (there is no "Sales trend app"). ' +
        'Never mention internal field, table, or series names, or JSON, in your ' +
        'answer — speak only in plain business terms. Be concise: give a few ' +
        'specific, non-repetitive points, not a long generic list. ' +
        'Speak plainly, in short sentences a non-accountant understands. ' +
        'If the snapshot genuinely lacks the answer, say so honestly and suggest ' +
        'where to look. Use the business currency when talking about money.\n\n' +
        'Respond with STRICT JSON ONLY (no markdown, no prose outside the JSON) ' +
        'matching this shape:\n' +
        '{"answer": string, "chart"?: {"type": "area"|"bar"|"line", "title": string, "seriesKey": string}, "table"?: {"title": string, "tableKey": string}}\n' +
        'Put your plain-language reply in "answer". Include "chart" ONLY when a ' +
        'visualisation genuinely helps AND a relevant series exists. "seriesKey" ' +
        'MUST be exactly one of the provided chart series keys — never invent a ' +
        'key. Include "table" when the user asks for a breakdown, comparison or ' +
        'list best shown as a table (e.g. "product performance across branches") ' +
        'AND a relevant data table exists — set "tableKey" to EXACTLY one of the ' +
        'provided table keys. You ONLY choose which chart/table to show and its ' +
        'title; you must NEVER invent, include, or compute rows or data points ' +
        'yourself — the app fills them from real figures.',
      messages: [
        {
          role: 'user',
          content: `${context}\n\nQuestion: ${question}`,
        },
      ],
      maxTokens: 1024,
    });

    if (!result.available) {
      return {
        available: false,
        message: 'AI assistant not configured',
      };
    }

    if (!result.text) {
      // Available but empty: a model refusal or an empty completion. Preserve
      // the friendly copilot fallback rather than surfacing a hard error.
      return {
        available: true,
        answer:
          'I cannot help with that question. Try asking about your sales, cash, stock or debtors.',
      };
    }

    // Parse the model reply. If it is JSON with an "answer", use that and
    // (optionally) attach a chart whose points are our real figures. If it is
    // not JSON, fall back to treating the whole reply as the answer text so the
    // existing text-only behaviour keeps working with any provider.
    const parsed = this.extractJson(result.text);
    if (parsed && typeof parsed.answer === 'string' && parsed.answer.trim()) {
      const chart = this.resolveChart(parsed.chart, series);
      const table = this.resolveTable(parsed.table, tables);
      const response: {
        available: true;
        answer: string;
        chart?: ReturnType<InsightsService['resolveChart']>;
        table?: ReturnType<InsightsService['resolveTable']>;
      } = { available: true, answer: parsed.answer.trim() };
      if (chart) response.chart = chart;
      if (table) response.table = table;
      return response;
    }

    return { available: true, answer: result.text };
  }
}
