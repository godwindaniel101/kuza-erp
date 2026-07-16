import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoicing/entities/invoice.entity';
import { Business } from '../../common/entities/business.entity';

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

/** Model ids — kept in one place so they are easy to audit/update. */
const COPILOT_MODEL = 'claude-sonnet-5';
const DIGEST_MODEL = 'claude-haiku-4-5-20251001';

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

  /**
   * Kuza Copilot: answers a plain-language question using ONLY the digest
   * data as context. Never throws — degraded states come back as
   * { available: false, message } with HTTP 200.
   */
  async ask(question: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        available: false,
        message: 'AI assistant not configured',
      };
    }

    const digest = await this.getDigest();
    const context = [
      `Business name: ${digest.businessName}`,
      `Currency: ${digest.currency}`,
      `Business data (JSON):`,
      JSON.stringify(digest),
    ].join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 1024,
          system:
            'You are Kuza Copilot, a financial assistant for small businesses. ' +
            'Answer ONLY from the provided business data. Speak plainly, in short ' +
            'sentences a non-accountant understands — no accounting jargon. ' +
            'If the data does not contain the answer, say so honestly and suggest ' +
            'what the owner could check instead. Use the business currency when ' +
            'talking about money.',
          messages: [
            {
              role: 'user',
              content: `${context}\n\nQuestion: ${question}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Anthropic API returned ${response.status} for copilot question`,
        );
        return {
          available: false,
          message: 'AI assistant is temporarily unavailable — try again shortly',
        };
      }

      const data: any = await response.json();
      if (data?.stop_reason === 'refusal') {
        return {
          available: true,
          answer:
            'I cannot help with that question. Try asking about your sales, cash, stock or debtors.',
        };
      }
      const answer = Array.isArray(data?.content)
        ? data.content
            .filter((block: any) => block?.type === 'text')
            .map((block: any) => block.text)
            .join('')
            .trim()
        : '';

      if (!answer) {
        return {
          available: false,
          message: 'AI assistant returned no answer — try again shortly',
        };
      }

      return { available: true, answer };
    } catch (error) {
      this.logger.warn(`Copilot call failed: ${error?.message}`);
      return {
        available: false,
        message: 'AI assistant is temporarily unavailable — try again shortly',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
