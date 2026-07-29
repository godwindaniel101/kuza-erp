import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import { heroActionPrimary, heroActionGhost } from '@/components/ui/DashboardHero';
import StatCard from '@/components/ui/StatCard';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, firstOfMonthIso, todayIso, useCurrency } from '@/lib/format';
import Card from '@/components/Card';
import Button from '@/components/ui/Button';
import { GroupedBarChart, GroupedBarPoint } from '@/components/ui/charts';

interface JournalEntryLine {
  id: string;
  accountId: string;
  account?: { code: string; name: string };
  debit: number;
  credit: number;
  description?: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  memo?: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  lines: JournalEntryLine[];
}

const entryStatusVariant: Record<JournalEntry['status'], { variant: StatusBadgeVariant; label: string; icon: string }> = {
  DRAFT: { variant: 'pending', label: 'Draft', icon: 'bx-edit' },
  POSTED: { variant: 'success', label: 'Posted', icon: 'bx-check-circle' },
  REVERSED: { variant: 'error', label: 'Reversed', icon: 'bx-undo' },
};

const reportLinks = [
  { href: '/accounting/reports/trial-balance', title: 'Trial Balance', icon: 'bx-list-check', description: 'Debits vs credits by account' },
  { href: '/accounting/reports/profit-loss', title: 'Profit & Loss', icon: 'bx-line-chart', description: 'Income and expenses over a period' },
  { href: '/accounting/reports/balance-sheet', title: 'Balance Sheet', icon: 'bx-spreadsheet', description: 'Assets, liabilities and equity' },
  { href: '/accounting/reports/general-ledger', title: 'General Ledger', icon: 'bx-book-open', description: 'Account activity with running balance' },
];

export default function AccountingDashboardPage() {
  const router = useRouter();
  const currency = useCurrency();
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<number | null>(null);
  const [netProfit, setNetProfit] = useState<number | null>(null);
  const [outstandingAr, setOutstandingAr] = useState<number | null>(null);
  const [cashAndBank, setCashAndBank] = useState<number | null>(null);
  const [inBalance, setInBalance] = useState<boolean | null>(null);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [monthlySeries, setMonthlySeries] = useState<GroupedBarPoint[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.get<{ success: boolean; data: { netProfit: number; totalIncome?: number; totalExpenses?: number } }>(
        `/accounting/reports/profit-loss?from=${firstOfMonthIso()}&to=${todayIso()}`,
      ),
      api.get<{ success: boolean; data: { summary?: { totalOutstanding: number } } }>('/invoices?page=1&limit=1'),
      api.get<{
        success: boolean;
        data: { rows: Array<{ code: string; debit: number; credit: number }> };
      }>(`/accounting/reports/trial-balance?asOf=${todayIso()}`),
      api.get<{ success: boolean; data: { items: JournalEntry[] } }>('/accounting/journal-entries?page=1&limit=6'),
    ]);

    const [pnlRes, invoicesRes, tbRes, entriesRes] = results;

    if (pnlRes.status === 'fulfilled' && pnlRes.value.success) {
      const pnl = pnlRes.value.data;
      setNetProfit(Number(pnl.netProfit ?? 0));
      setRevenue(Number(pnl.totalIncome ?? 0));
      setExpenses(Number(pnl.totalExpenses ?? 0));
    }
    if (invoicesRes.status === 'fulfilled' && invoicesRes.value.success) {
      setOutstandingAr(Number(invoicesRes.value.data.summary?.totalOutstanding ?? 0));
    }
    if (tbRes.status === 'fulfilled' && tbRes.value.success) {
      const rows = tbRes.value.data.rows || [];
      const cash = rows
        .filter((r) => r.code === '1000' || r.code === '1010')
        .reduce((sum, r) => sum + (Number(r.debit || 0) - Number(r.credit || 0)), 0);
      setCashAndBank(cash);
      const totalDebit = rows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
      const totalCredit = rows.reduce((sum, r) => sum + Number(r.credit || 0), 0);
      setInBalance(Math.abs(totalDebit - totalCredit) < 0.01);
    }
    if (entriesRes.status === 'fulfilled' && entriesRes.value.success) {
      setRecentEntries(entriesRes.value.data.items || []);
    }

    if (results.some((r) => r.status === 'rejected')) {
      setToast({ message: 'Some accounting data failed to load', type: 'error' });
    }

    // Income vs expenses — last 6 months (6 parallel P&L calls; chart tolerates failures)
    try {
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const from = d.toISOString().slice(0, 10);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const to = (end > now ? now : end).toISOString().slice(0, 10);
        return { label: d.toLocaleDateString('en-US', { month: 'short' }), from, to };
      });
      const pnls = await Promise.allSettled(
        months.map((mth) =>
          api.get<{ success: boolean; data: { totalIncome?: number; totalExpenses?: number } }>(
            `/accounting/reports/profit-loss?from=${mth.from}&to=${mth.to}`,
          ),
        ),
      );
      setMonthlySeries(
        months.map((mth, i) => {
          const res = pnls[i];
          const ok = res.status === 'fulfilled' && res.value.success ? res.value.data : null;
          return {
            label: mth.label,
            a: Number(ok?.totalIncome ?? 0),
            b: Number(ok?.totalExpenses ?? 0),
          };
        }),
      );
    } catch {
      setMonthlySeries([]);
    }
    setLoading(false);
  };

  const entryTotal = (entry: JournalEntry) =>
    (entry.lines || []).reduce((sum, l) => sum + Number(l.debit || 0), 0);

  // Sparklines derived from the same 6-month series the chart uses
  const incomeSpark = monthlySeries.map((m) => m.a);
  const expenseSpark = monthlySeries.map((m) => m.b);
  const netSpark = monthlySeries.map((m) => m.a - m.b);
  const draftCount = recentEntries.filter((e) => e.status === 'DRAFT').length;

  const statusLine = loading
    ? 'Loading your books…'
    : draftCount > 0
    ? `${draftCount} draft ${draftCount === 1 ? 'entry' : 'entries'} awaiting posting`
    : inBalance === true
    ? 'Trial balance in balance ✓'
    : inBalance === false
    ? 'Trial balance is out of balance — review the ledger'
    : 'Financial overview of your business';

  return (
    <div className="space-y-6 kz-stagger">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/accounting/reports" className={heroActionGhost}>
          <i className="bx bx-bar-chart-alt-2" aria-hidden="true"></i> Reports
        </Link>
        <Link href="/accounting/journal-entries/new" className={heroActionPrimary}>
          <i className="bx bx-plus" aria-hidden="true"></i> New Journal Entry
        </Link>
      </div>

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <CardSkeleton count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Revenue (this month)"
            value={formatMoney(revenue ?? 0, currency)}
            icon="bx-trending-up"
            tone="info"
            caption={`${formatDate(firstOfMonthIso())} – ${formatDate(todayIso())}`}
            spark={incomeSpark.length > 1 ? incomeSpark : undefined}
          />
          <StatCard
            label="Expenses (this month)"
            value={formatMoney(expenses ?? 0, currency)}
            icon="bx-credit-card"
            tone="warning"
            caption="Operating outflow"
            spark={expenseSpark.length > 1 ? expenseSpark : undefined}
          />
          <StatCard
            label="Net Profit (this month)"
            value={formatMoney(netProfit ?? 0, currency)}
            icon="bx-line-chart"
            tone={(netProfit ?? 0) >= 0 ? 'success' : 'error'}
            caption={(netProfit ?? 0) >= 0 ? 'In the black' : 'Running at a loss'}
            spark={netSpark.length > 1 ? netSpark : undefined}
          />
          <StatCard
            label="Accounts Receivable"
            value={formatMoney(outstandingAr ?? 0, currency)}
            icon="bx-receipt"
            tone="default"
            caption="Unpaid invoice balances"
          />
        </div>
      )}

      {/* Income vs expenses + financial position */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Income vs expenses" subtitle="Last 6 months" className="lg:col-span-2">
          <GroupedBarChart data={monthlySeries} formatValue={(v) => formatMoney(v, currency)} />
        </Card>

        <Card title="Financial position">
          <div className="divide-y divide-gray-100 dark:divide-gray-800 -my-1">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                  <i className="bx bx-wallet text-lg" aria-hidden="true"></i>
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Cash &amp; Bank</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Accounts 1000 / 1010</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatMoney(cashAndBank ?? 0, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <i className="bx bx-receipt text-lg" aria-hidden="true"></i>
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Receivables</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding from customers</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatMoney(outstandingAr ?? 0, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <i className="bx bx-list-check text-lg" aria-hidden="true"></i>
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Trial balance</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">As of {formatDate(todayIso())}</p>
                </div>
              </div>
              {inBalance == null ? (
                <span className="text-sm text-gray-400">—</span>
              ) : (
                <StatusBadge variant={inBalance ? 'success' : 'error'} label={inBalance ? 'Balanced' : 'Off'} size="sm" />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent journal entries */}
      <Card padding={false}>
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h3 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">Recent journal entries</h3>
          <Button href="/accounting/journal-entries" variant="ghost" size="sm">
            View all
          </Button>
        </div>
        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[0, 1, 2, 3, 4].map((k) => (
              <div key={k} className="flex items-center gap-3 px-5 py-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        ) : recentEntries.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon="bx-book"
              title="No journal entries yet"
              description="Create your first journal entry to start recording transactions"
              actions={
                <Button href="/accounting/journal-entries/new" size="sm">
                  New Journal Entry
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentEntries.map((entry) => {
              const status = entryStatusVariant[entry.status] ?? entryStatusVariant.DRAFT;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => router.push(`/accounting/journal-entries/${entry.id}`)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <i className="bx bx-book-content text-lg" aria-hidden="true"></i>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{entry.entryNumber}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(entry.date)}
                      {entry.memo ? ` · ${entry.memo}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                    {formatMoney(entryTotal(entry), currency)}
                  </span>
                  <StatusBadge variant={status.variant} label={status.label} icon={status.icon} size="sm" className="shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Report quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportLinks.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="kz-lift bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6 hover:ring-accent-ring group"
          >
            <div className="h-10 w-10 rounded-lg bg-accent-soft flex items-center justify-center mb-3">
              <i className={`bx ${report.icon} text-xl text-accent`} aria-hidden="true"></i>
            </div>
            <h3 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-white group-hover:text-accent transition-colors">
              {report.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
          </Link>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
