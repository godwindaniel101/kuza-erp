import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalLine } from './entities/journal-line.entity';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { fromCents, toCents } from './accounting.constants';

interface AccountBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  debitCents: number;
  creditCents: number;
}

/**
 * Financial reports over posted journal activity. DRAFT entries are always
 * excluded. REVERSED originals ARE included alongside their POSTED reversal
 * mirror: the GL is append-only, so a reversed pair stays in the ledger and
 * nets to zero. (Excluding the REVERSED original while keeping its POSTED
 * mirror would double-flip every reversal and corrupt balances.)
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(JournalLine)
    private journalLineRepository: Repository<JournalLine>,
    private chartOfAccountsService: ChartOfAccountsService,
  ) {}

  async trialBalance(asOf?: string) {
    await this.chartOfAccountsService.ensureSeeded();
    const balances = await this.accountBalances({ to: asOf });

    let totalDebit = 0;
    let totalCredit = 0;
    const rows = balances
      .map((b) => {
        const net = b.debitCents - b.creditCents;
        const debit = net > 0 ? net : 0;
        const credit = net < 0 ? -net : 0;
        totalDebit += debit;
        totalCredit += credit;
        return {
          accountId: b.accountId,
          code: b.code,
          name: b.name,
          type: b.type,
          debit: fromCents(debit),
          credit: fromCents(credit),
        };
      })
      .filter((r) => r.debit !== 0 || r.credit !== 0);

    return {
      asOf: asOf ?? null,
      rows,
      totals: { debit: fromCents(totalDebit), credit: fromCents(totalCredit) },
    };
  }

  async generalLedger(accountId: string, from?: string, to?: string) {
    await this.chartOfAccountsService.ensureSeeded();
    const account = await this.chartOfAccountsService.findOne(accountId);
    const debitNormal = account.normalBalance === 'DEBIT';

    // Opening balance: all posted activity strictly before `from`.
    let openingCents = 0;
    if (from) {
      const opening = await this.journalLineRepository.query(
        `SELECT COALESCE(SUM(l.debit), 0) AS "debit",
                COALESCE(SUM(l.credit), 0) AS "credit"
         FROM accounting_journal_lines l
         JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
         WHERE e.status IN ('POSTED', 'REVERSED')
           AND l.account_id = $1
           AND e.date < $2`,
        [accountId, from],
      );
      const d = toCents(opening?.[0]?.debit);
      const c = toCents(opening?.[0]?.credit);
      openingCents = debitNormal ? d - c : c - d;
    }

    const params: string[] = [accountId];
    let dateFilter = '';
    if (from) {
      params.push(from);
      dateFilter += ` AND e.date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      dateFilter += ` AND e.date <= $${params.length}`;
    }
    const raw: {
      date: string;
      entryNumber: string;
      memo: string | null;
      description: string | null;
      debit: string;
      credit: string;
    }[] = await this.journalLineRepository.query(
      `SELECT e.date AS "date",
              e.entry_number AS "entryNumber",
              e.memo AS "memo",
              l.description AS "description",
              l.debit AS "debit",
              l.credit AS "credit"
       FROM accounting_journal_lines l
       JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
       WHERE e.status IN ('POSTED', 'REVERSED')
         AND l.account_id = $1${dateFilter}
       ORDER BY e.date ASC, e.entry_number ASC, l.created_at ASC`,
      params,
    );

    let runningCents = openingCents;
    const rows = raw.map((r) => {
      const d = toCents(r.debit);
      const c = toCents(r.credit);
      runningCents += debitNormal ? d - c : c - d;
      return {
        date: r.date,
        entryNumber: r.entryNumber,
        memo: r.memo,
        description: r.description,
        debit: fromCents(d),
        credit: fromCents(c),
        runningBalance: fromCents(runningCents),
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
      },
      openingBalance: fromCents(openingCents),
      rows,
      closingBalance: fromCents(runningCents),
    };
  }

  async profitLoss(from?: string, to?: string) {
    await this.chartOfAccountsService.ensureSeeded();
    const balances = await this.accountBalances({ from, to });

    const income: { accountId: string; code: string; name: string; amount: number }[] = [];
    const expenses: { accountId: string; code: string; name: string; amount: number }[] = [];
    let totalIncomeCents = 0;
    let totalExpensesCents = 0;

    for (const b of balances) {
      if (b.type === 'INCOME') {
        const amount = b.creditCents - b.debitCents;
        if (amount !== 0) {
          income.push({
            accountId: b.accountId,
            code: b.code,
            name: b.name,
            amount: fromCents(amount),
          });
        }
        totalIncomeCents += amount;
      } else if (b.type === 'EXPENSE') {
        const amount = b.debitCents - b.creditCents;
        if (amount !== 0) {
          expenses.push({
            accountId: b.accountId,
            code: b.code,
            name: b.name,
            amount: fromCents(amount),
          });
        }
        totalExpensesCents += amount;
      }
    }

    return {
      from: from ?? null,
      to: to ?? null,
      income,
      expenses,
      totalIncome: fromCents(totalIncomeCents),
      totalExpenses: fromCents(totalExpensesCents),
      netProfit: fromCents(totalIncomeCents - totalExpensesCents),
    };
  }

  async balanceSheet(asOf?: string) {
    await this.chartOfAccountsService.ensureSeeded();
    const balances = await this.accountBalances({ to: asOf });

    const section = () =>
      [] as { accountId: string; code: string; name: string; amount: number }[];
    const assets = section();
    const liabilities = section();
    const equity = section();

    let totalAssetsCents = 0;
    let totalLiabilitiesCents = 0;
    let equityAccountsCents = 0;
    let retainedEarningsCents = 0;

    for (const b of balances) {
      if (b.type === 'ASSET') {
        const amount = b.debitCents - b.creditCents;
        totalAssetsCents += amount;
        if (amount !== 0) {
          assets.push(this.sectionRow(b, amount));
        }
      } else if (b.type === 'LIABILITY') {
        const amount = b.creditCents - b.debitCents;
        totalLiabilitiesCents += amount;
        if (amount !== 0) {
          liabilities.push(this.sectionRow(b, amount));
        }
      } else if (b.type === 'EQUITY') {
        const amount = b.creditCents - b.debitCents;
        equityAccountsCents += amount;
        if (amount !== 0) {
          equity.push(this.sectionRow(b, amount));
        }
      } else if (b.type === 'INCOME') {
        retainedEarningsCents += b.creditCents - b.debitCents;
      } else if (b.type === 'EXPENSE') {
        retainedEarningsCents -= b.debitCents - b.creditCents;
      }
    }

    // Net income to date is rolled into equity so the sheet balances
    // (no formal year-end close exists yet).
    const totalEquityCents = equityAccountsCents + retainedEarningsCents;

    return {
      asOf: asOf ?? null,
      assets,
      liabilities,
      equity,
      totalAssets: fromCents(totalAssetsCents),
      totalLiabilities: fromCents(totalLiabilitiesCents),
      totalEquity: fromCents(totalEquityCents),
      retainedEarnings: fromCents(retainedEarningsCents),
      balanced: totalAssetsCents === totalLiabilitiesCents + totalEquityCents,
    };
  }

  // ---------------------------------------------------------------------

  private sectionRow(b: AccountBalanceRow, amountCents: number) {
    return {
      accountId: b.accountId,
      code: b.code,
      name: b.name,
      amount: fromCents(amountCents),
    };
  }

  /**
   * Σdebit/Σcredit per account over posted activity (POSTED +
   * REVERSED-with-POSTED-mirror pairs) in the given window. DRAFT lines never
   * count. Raw SQL with unqualified table names on purpose: relation joins
   * through the query builder resolve to the wrong schema under the tenant
   * transaction (known F7 quirk); unqualified raw SQL follows search_path.
   */
  private async accountBalances(bounds: {
    from?: string;
    to?: string;
  }): Promise<AccountBalanceRow[]> {
    const params: string[] = [];
    let dateFilter = '';
    if (bounds.from) {
      params.push(bounds.from);
      dateFilter += ` AND e.date >= $${params.length}`;
    }
    if (bounds.to) {
      params.push(bounds.to);
      dateFilter += ` AND e.date <= $${params.length}`;
    }

    const raw: {
      accountId: string;
      code: string;
      name: string;
      type: string;
      normalBalance: string;
      debit: string;
      credit: string;
    }[] = await this.journalLineRepository.query(
      `SELECT a.id AS "accountId",
              a.code AS "code",
              a.name AS "name",
              a.type AS "type",
              a.normal_balance AS "normalBalance",
              COALESCE(SUM(l.debit), 0) AS "debit",
              COALESCE(SUM(l.credit), 0) AS "credit"
       FROM accounting_journal_lines l
       JOIN accounting_journal_entries e ON e.id = l.journal_entry_id
       JOIN accounting_accounts a ON a.id = l.account_id
       WHERE e.status IN ('POSTED', 'REVERSED')${dateFilter}
       GROUP BY a.id, a.code, a.name, a.type, a.normal_balance
       ORDER BY a.code ASC`,
      params,
    );

    return raw.map((r) => ({
      accountId: r.accountId,
      code: r.code,
      name: r.name,
      type: r.type,
      normalBalance: r.normalBalance,
      debitCents: toCents(r.debit),
      creditCents: toCents(r.credit),
    }));
  }
}
