import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { Business } from '../../common/entities/business.entity';
import { LlmService } from '../../common/ai/llm.service';

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
  ) {}

  private async sql<T = any>(query: string, params: any[] = []): Promise<T[]> {
    return this.invoiceRepository.query(query, params);
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
    const businessName = business?.name || 'Your business';

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
        headline: 'Cash position unavailable',
      }),
      this.safe(() => this.profitThisMonth(currency), {
        income: 0,
        expense: 0,
        profit: 0,
        headline: 'Profit figures unavailable',
      }),
      this.safe(() => this.topDebtors(currency), []),
      this.safe(() => this.lowStock(), []),
      this.safe(() => this.salesTrend(currency), {
        thisMonth: 0,
        lastMonth: 0,
        changePct: null as number | null,
        headline: 'Sales trend unavailable',
      }),
      this.safe(() => this.overdueTotal(currency), {
        amount: 0,
        count: 0,
        headline: 'No overdue invoices',
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
    const d = await this.getDigest();
    const insights: Array<{ title: string; body: string; tone: 'positive' | 'warning' | 'info'; metric?: string }> = [];
    if (d.profitThisMonth) {
      insights.push({
        title: 'Profit this month',
        body: d.profitThisMonth.headline,
        tone: (d.profitThisMonth.profit ?? 0) >= 0 ? 'positive' : 'warning',
      });
    }
    if (d.salesTrend) {
      insights.push({
        title: 'Sales trend',
        body: d.salesTrend.headline,
        tone: (d.salesTrend.changePct ?? 0) >= 0 ? 'positive' : 'info',
      });
    }
    if (d.cashPosition) {
      insights.push({ title: 'Cash position', body: d.cashPosition.headline, tone: 'info' });
    }
    if (d.overdueTotal && (d.overdueTotal.amount ?? 0) > 0) {
      insights.push({
        title: 'Money owed to you',
        body: (Array.isArray(d.topDebtors) && d.topDebtors[0]?.headline) || d.overdueTotal.headline,
        tone: 'warning',
      });
    }
    if (Array.isArray(d.lowStock) && d.lowStock.length > 0) {
      insights.push({
        title: 'Low stock',
        body: d.lowStock[0]?.headline || `${d.lowStock.length} item(s) running low`,
        tone: 'warning',
      });
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
        ? `You have ${this.formatMoney(amount, currency)} in cash and bank right now`
        : `Your cash accounts are overdrawn by ${this.formatMoney(Math.abs(amount), currency)}`;
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
        ? `You have made ${this.formatMoney(profit, currency)} profit so far this month (${this.formatMoney(income, currency)} earned, ${this.formatMoney(expense, currency)} spent)`
        : `You are ${this.formatMoney(Math.abs(profit), currency)} in the red this month (${this.formatMoney(income, currency)} earned, ${this.formatMoney(expense, currency)} spent)`;
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
          ? `${row.name} owes ${this.formatMoney(outstanding, currency)} — ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} late`
          : `${row.name} owes ${this.formatMoney(outstanding, currency)} — not due yet`;
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
          ? `${row.name} is out of stock — minimum is ${minimumStock}`
          : `${row.name} is below minimum stock: ${currentStock} left, minimum ${minimumStock}`;
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
          ? `Sales this month: ${this.formatMoney(current, currency)} (no sales last month to compare)`
          : 'No sales recorded this month or last month';
    } else if (changePct >= 0) {
      headline = `Sales are up ${changePct}% — ${this.formatMoney(current, currency)} this month vs ${this.formatMoney(previous, currency)} last month`;
    } else {
      headline = `Sales are down ${Math.abs(changePct)}% — ${this.formatMoney(current, currency)} this month vs ${this.formatMoney(previous, currency)} last month`;
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
        ? `${this.formatMoney(amount, currency)} is overdue across ${count} invoice${count === 1 ? '' : 's'} — time to chase payments`
        : 'No overdue invoices — well done';
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
        headline: `${row.name}: ${this.formatMoney(revenue, currency)} from ${qty} sold this month`,
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

  /**
   * Kuza Copilot: answers a plain-language question using ONLY the digest
   * data as context. Never throws — degraded states come back as
   * { available: false, message } with HTTP 200.
   */
  async ask(question: string) {
    const digest = await this.getDigest();
    const series = await this.buildSeries(digest);

    const seriesKeys = Object.keys(series);
    const seriesBlock = seriesKeys.length
      ? `Available chart series (use one of these EXACT keys as seriesKey, never invent one):\n${seriesKeys
          .map((k) => `- ${k} (${series[k].type}): ${series[k].description}`)
          .join('\n')}`
      : 'No chart series are available for this business right now — do not include a chart.';

    const context = [
      `Business name: ${digest.businessName}`,
      `Currency: ${digest.currency}`,
      `Business data (JSON):`,
      JSON.stringify(digest),
      '',
      seriesBlock,
    ].join('\n');

    // Provider-agnostic: LlmService picks the backend from AI_PROVIDER and
    // never throws — an unconfigured/unreachable/errored provider comes back
    // as { available: false } and we degrade to the "not configured" shape.
    const result = await this.llm.chat({
      system:
        'You are Kuza Copilot, a financial assistant for small businesses. ' +
        'Answer ONLY from the provided business data. Speak plainly, in short ' +
        'sentences a non-accountant understands — no accounting jargon. ' +
        'If the data does not contain the answer, say so honestly and suggest ' +
        'what the owner could check instead. Use the business currency when ' +
        'talking about money.\n\n' +
        'Respond with STRICT JSON ONLY (no markdown, no prose outside the JSON) ' +
        'matching this shape:\n' +
        '{"answer": string, "chart"?: {"type": "area"|"bar"|"line", "title": string, "seriesKey": string}}\n' +
        'Put your plain-language reply in "answer". Include "chart" ONLY when a ' +
        'visualisation genuinely helps AND a relevant series exists. "seriesKey" ' +
        'MUST be exactly one of the provided chart series keys — never invent a ' +
        'key. You only choose the chart type and which series to show; you must ' +
        'NEVER invent or include data points yourself.',
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
      return chart
        ? { available: true, answer: parsed.answer.trim(), chart }
        : { available: true, answer: parsed.answer.trim() };
    }

    return { available: true, answer: result.text };
  }
}
