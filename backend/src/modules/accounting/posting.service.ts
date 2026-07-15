import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ACCOUNT_CODES, toCents } from './accounting.constants';

export interface PostEntryLineInput {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface PostEntryInput {
  /** YYYY-MM-DD; defaults to today. */
  date?: string;
  memo?: string;
  /** Business event identity — one journal entry per (sourceType, sourceId). */
  sourceType?: string;
  sourceId?: string;
  lines: PostEntryLineInput[];
  /** Default true: entry is POSTED immediately. false leaves a DRAFT. */
  autoPost?: boolean;
  postedById?: string;
}

@Injectable()
export class PostingService {
  constructor(
    @InjectRepository(JournalEntry)
    private journalEntryRepository: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private journalLineRepository: Repository<JournalLine>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private chartOfAccountsService: ChartOfAccountsService,
  ) {}

  /**
   * Create a balanced journal entry. Validates every line is debit XOR
   * credit and that Σdebits === Σcredits > 0 (compared in integer cents).
   * Idempotent per (sourceType, sourceId): if an entry already exists for
   * the business event, it is returned unchanged. Posted entries are
   * immutable — there is no update path; use reverse() to undo.
   */
  @Transactional()
  async postEntry(input: PostEntryInput): Promise<JournalEntry> {
    await this.chartOfAccountsService.ensureSeeded();

    if ((input.sourceType && !input.sourceId) || (!input.sourceType && input.sourceId)) {
      throw new BadRequestException(
        'sourceType and sourceId must be provided together',
      );
    }

    // Idempotency: one entry per business event.
    if (input.sourceType && input.sourceId) {
      const existing = await this.journalEntryRepository.findOne({
        where: { sourceType: input.sourceType, sourceId: input.sourceId },
      });
      if (existing) {
        return this.loadEntry(existing.id);
      }
    }

    const validated = this.validateLines(
      input.lines?.map((l) => ({
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
        description: l.description,
      })) ?? [],
    );

    // Resolve account codes → accounts.
    const codes = [...new Set(input.lines.map((l) => l.accountCode))];
    const accounts = await this.accountRepository.find({
      where: { code: In(codes) },
    });
    const byCode = new Map(accounts.map((a) => [a.code, a]));
    for (const code of codes) {
      if (!byCode.has(code)) {
        throw new BadRequestException(`Unknown account code: ${code}`);
      }
    }

    const autoPost = input.autoPost !== false;
    const now = new Date();

    // Save header first, then lines with an explicit journalEntryId: cascade
    // inserts through the OneToMany do not reliably backfill the FK under the
    // tenant transaction (same relation quirk noted in ROADMAP.md/F7).
    const entry = this.journalEntryRepository.create({
      entryNumber: await this.nextEntryNumber(),
      date: input.date ?? this.today(),
      memo: input.memo ?? null,
      status: autoPost ? 'POSTED' : 'DRAFT',
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      postedAt: autoPost ? now : null,
      postedById: autoPost ? (input.postedById ?? null) : null,
    });
    const saved = await this.journalEntryRepository.save(entry);

    await this.journalLineRepository.save(
      input.lines.map((l, i) =>
        this.journalLineRepository.create({
          journalEntryId: saved.id,
          accountId: byCode.get(l.accountCode)!.id,
          debit: validated[i].debit.toFixed(2),
          credit: validated[i].credit.toFixed(2),
          description: l.description ?? null,
        }),
      ),
    );

    return this.loadEntry(saved.id);
  }

  /**
   * Reverse a POSTED entry: creates a mirrored entry (debits ↔ credits),
   * marks the original REVERSED and links reversedByEntryId.
   */
  @Transactional()
  async reverse(entryId: string, userId?: string): Promise<JournalEntry> {
    const original = await this.journalEntryRepository.findOne({
      where: { id: entryId },
    });
    if (!original) {
      throw new NotFoundException('Journal entry not found');
    }
    if (original.status !== 'POSTED') {
      throw new BadRequestException(
        `Only POSTED entries can be reversed (entry is ${original.status})`,
      );
    }
    // Direct line query (relation loads mis-resolve schema — F7 quirk).
    original.lines = await this.journalLineRepository.find({
      where: { journalEntryId: original.id },
      order: { createdAt: 'ASC' },
    });

    // Header first, then lines with explicit FK (see postEntry note).
    const reversal = this.journalEntryRepository.create({
      entryNumber: await this.nextEntryNumber(),
      date: this.today(),
      memo: `Reversal of ${original.entryNumber}${original.memo ? `: ${original.memo}` : ''}`,
      status: 'POSTED',
      sourceType: 'reversal',
      sourceId: original.id,
      postedAt: new Date(),
      postedById: userId ?? null,
    });
    const savedReversal = await this.journalEntryRepository.save(reversal);

    await this.journalLineRepository.save(
      original.lines.map((l) =>
        this.journalLineRepository.create({
          journalEntryId: savedReversal.id,
          accountId: l.accountId,
          debit: Number(l.credit).toFixed(2),
          credit: Number(l.debit).toFixed(2),
          description: l.description,
        }),
      ),
    );

    original.status = 'REVERSED';
    original.reversedByEntryId = savedReversal.id;
    await this.journalEntryRepository.save(original);

    return this.loadEntry(savedReversal.id);
  }

  // ---------------------------------------------------------------------
  // Typed convenience posters (audit §5 target postings)
  // ---------------------------------------------------------------------

  /** Goods receipt: Dr Inventory / Cr Accounts Payable (or Bank when paid cash). */
  async postGoodsReceipt(params: {
    inflowId: string;
    amount: number;
    isCash?: boolean;
    date?: string;
    memo?: string;
  }): Promise<JournalEntry> {
    const creditCode = params.isCash
      ? ACCOUNT_CODES.BANK
      : ACCOUNT_CODES.ACCOUNTS_PAYABLE;
    return this.postEntry({
      date: params.date,
      memo: params.memo ?? 'Goods receipt',
      sourceType: 'inflow',
      sourceId: params.inflowId,
      lines: [
        { accountCode: ACCOUNT_CODES.INVENTORY, debit: params.amount },
        { accountCode: creditCode, credit: params.amount },
      ],
    });
  }

  /**
   * Sale: Dr Cash (or AR) revenue+tax / Cr Sales Revenue + Cr Tax Payable,
   * plus Dr COGS / Cr Inventory when cogs > 0.
   */
  async postSale(params: {
    sourceType: string;
    sourceId: string;
    revenue: number;
    cogs?: number;
    tax?: number;
    isCash?: boolean;
    date?: string;
    memo?: string;
  }): Promise<JournalEntry> {
    const tax = params.tax ?? 0;
    const cogs = params.cogs ?? 0;
    const receivableCode = params.isCash
      ? ACCOUNT_CODES.CASH_ON_HAND
      : ACCOUNT_CODES.ACCOUNTS_RECEIVABLE;

    const lines: PostEntryLineInput[] = [
      { accountCode: receivableCode, debit: params.revenue + tax },
      { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: params.revenue },
    ];
    if (toCents(tax) > 0) {
      lines.push({ accountCode: ACCOUNT_CODES.TAX_PAYABLE, credit: tax });
    }
    if (toCents(cogs) > 0) {
      lines.push(
        { accountCode: ACCOUNT_CODES.COST_OF_GOODS_SOLD, debit: cogs },
        { accountCode: ACCOUNT_CODES.INVENTORY, credit: cogs },
      );
    }

    return this.postEntry({
      date: params.date,
      memo: params.memo ?? 'Sale',
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      lines,
    });
  }

  /**
   * Inventory adjustment. Sign of `amount` decides direction:
   * amount < 0 (write-off / shrinkage) → Dr Inventory Adjustment Expense / Cr Inventory;
   * amount > 0 (found stock / write-up)  → Dr Inventory / Cr Inventory Adjustment Expense.
   */
  async postInventoryAdjustment(params: {
    adjustmentId: string;
    amount: number;
    date?: string;
    memo?: string;
  }): Promise<JournalEntry> {
    const cents = toCents(params.amount);
    if (!cents || Number.isNaN(cents)) {
      throw new BadRequestException(
        'Adjustment amount must be a non-zero number',
      );
    }
    const abs = Math.abs(params.amount);
    const lines: PostEntryLineInput[] =
      cents < 0
        ? [
            {
              accountCode: ACCOUNT_CODES.INVENTORY_ADJUSTMENT_EXPENSE,
              debit: abs,
            },
            { accountCode: ACCOUNT_CODES.INVENTORY, credit: abs },
          ]
        : [
            { accountCode: ACCOUNT_CODES.INVENTORY, debit: abs },
            {
              accountCode: ACCOUNT_CODES.INVENTORY_ADJUSTMENT_EXPENSE,
              credit: abs,
            },
          ];

    return this.postEntry({
      date: params.date,
      memo: params.memo ?? 'Inventory adjustment',
      sourceType: 'inventory_adjustment',
      sourceId: params.adjustmentId,
      lines,
    });
  }

  /** Payroll run: Dr Wage Expense gross / Cr Wages Payable net / Cr Tax Payable withheld. */
  async postPayrollRun(params: {
    payrollId: string;
    gross: number;
    taxWithheld: number;
    net: number;
    date?: string;
    memo?: string;
  }): Promise<JournalEntry> {
    if (toCents(params.gross) !== toCents(params.net) + toCents(params.taxWithheld)) {
      throw new BadRequestException(
        'Payroll does not balance: gross must equal net + taxWithheld',
      );
    }
    const lines: PostEntryLineInput[] = [
      { accountCode: ACCOUNT_CODES.WAGE_EXPENSE, debit: params.gross },
      { accountCode: ACCOUNT_CODES.WAGES_PAYABLE, credit: params.net },
    ];
    if (toCents(params.taxWithheld) > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.TAX_PAYABLE,
        credit: params.taxWithheld,
      });
    }
    return this.postEntry({
      date: params.date,
      memo: params.memo ?? 'Payroll run',
      sourceType: 'payroll',
      sourceId: params.payrollId,
      lines,
    });
  }

  /** Invoice issued: Dr Accounts Receivable / Cr Sales Revenue + Cr Tax Payable. */
  async postInvoiceIssued(params: {
    invoiceId: string;
    subtotal: number;
    tax?: number;
    date?: string;
    memo?: string;
  }): Promise<JournalEntry> {
    const tax = params.tax ?? 0;
    const lines: PostEntryLineInput[] = [
      {
        accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        debit: params.subtotal + tax,
      },
      { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: params.subtotal },
    ];
    if (toCents(tax) > 0) {
      lines.push({ accountCode: ACCOUNT_CODES.TAX_PAYABLE, credit: tax });
    }
    return this.postEntry({
      date: params.date,
      memo: params.memo ?? 'Invoice issued',
      sourceType: 'invoice',
      sourceId: params.invoiceId,
      lines,
    });
  }

  /** Customer payment: Dr Bank / Cr Accounts Receivable. */
  async postCustomerPayment(params: {
    paymentId: string;
    amount: number;
    date?: string;
    memo?: string;
  }): Promise<JournalEntry> {
    return this.postEntry({
      date: params.date,
      memo: params.memo ?? 'Customer payment',
      sourceType: 'customer_payment',
      sourceId: params.paymentId,
      lines: [
        { accountCode: ACCOUNT_CODES.BANK, debit: params.amount },
        {
          accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
          credit: params.amount,
        },
      ],
    });
  }

  // ---------------------------------------------------------------------
  // Shared validation / helpers (also used by JournalEntriesService)
  // ---------------------------------------------------------------------

  /**
   * Validates a set of lines: non-empty, each line debit XOR credit > 0,
   * Σdebits === Σcredits > 0. All comparisons in integer cents.
   * Returns amounts normalized to numbers.
   */
  validateLines(
    lines: { debit: number | string; credit: number | string; description?: string }[],
  ): { debit: number; credit: number }[] {
    if (!lines || lines.length === 0) {
      throw new BadRequestException(
        'A journal entry must have at least one line',
      );
    }

    let totalDebit = 0;
    let totalCredit = 0;
    const normalized = lines.map((line, index) => {
      const debitCents = toCents(line.debit);
      const creditCents = toCents(line.credit);
      if (Number.isNaN(debitCents) || Number.isNaN(creditCents)) {
        throw new BadRequestException(`Line ${index + 1}: invalid amount`);
      }
      if (debitCents < 0 || creditCents < 0) {
        throw new BadRequestException(
          `Line ${index + 1}: amounts cannot be negative`,
        );
      }
      const hasDebit = debitCents > 0;
      const hasCredit = creditCents > 0;
      if (hasDebit === hasCredit) {
        throw new BadRequestException(
          `Line ${index + 1}: each line must have either a debit or a credit (exclusively) greater than zero`,
        );
      }
      totalDebit += debitCents;
      totalCredit += creditCents;
      return { debit: debitCents / 100, credit: creditCents / 100 };
    });

    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Journal entry is not balanced: debits ${(totalDebit / 100).toFixed(2)} != credits ${(totalCredit / 100).toFixed(2)}`,
      );
    }
    if (totalDebit <= 0) {
      throw new BadRequestException(
        'Journal entry total must be greater than zero',
      );
    }

    return normalized;
  }

  /** Next sequential entry number for this tenant, e.g. JE-000001. */
  async nextEntryNumber(): Promise<string> {
    const row = await this.journalEntryRepository
      .createQueryBuilder('entry')
      .select(
        "COALESCE(MAX(CAST(SUBSTRING(entry.entryNumber FROM 4) AS INTEGER)), 0)",
        'max',
      )
      .getRawOne<{ max: string }>();
    const next = Number(row?.max ?? 0) + 1;
    return `JE-${String(next).padStart(6, '0')}`;
  }

  private async loadEntry(id: string): Promise<JournalEntry> {
    // Direct queries instead of relation loads: OneToMany relation loads
    // resolve to the wrong schema under the tenant transaction (F7 quirk).
    const entry = await this.journalEntryRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }
    const lines = await this.journalLineRepository.find({
      where: { journalEntryId: id },
      order: { createdAt: 'ASC' },
    });
    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const accounts = accountIds.length
      ? await this.accountRepository.find({ where: { id: In(accountIds) } })
      : [];
    const accountById = new Map(accounts.map((a) => [a.id, a]));
    for (const line of lines) {
      line.account = accountById.get(line.accountId) ?? line.account;
    }
    entry.lines = lines;
    return entry;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
