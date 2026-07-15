import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
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

const entryStatusVariant: Record<JournalEntry['status'], { variant: StatusBadgeVariant; label: string }> = {
  DRAFT: { variant: 'pending', label: 'Draft' },
  POSTED: { variant: 'success', label: 'Posted' },
  REVERSED: { variant: 'error', label: 'Reversed' },
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
  const [netProfit, setNetProfit] = useState<number | null>(null);
  const [outstandingAr, setOutstandingAr] = useState<number | null>(null);
  const [cashAndBank, setCashAndBank] = useState<number | null>(null);
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
      api.get<{ success: boolean; data: { netProfit: number } }>(
        `/accounting/reports/profit-loss?from=${firstOfMonthIso()}&to=${todayIso()}`,
      ),
      api.get<{ success: boolean; data: { summary?: { totalOutstanding: number } } }>('/invoices?page=1&limit=1'),
      api.get<{
        success: boolean;
        data: { rows: Array<{ code: string; debit: number; credit: number }> };
      }>(`/accounting/reports/trial-balance?asOf=${todayIso()}`),
      api.get<{ success: boolean; data: { items: JournalEntry[] } }>('/accounting/journal-entries?page=1&limit=5'),
    ]);

    const [pnlRes, invoicesRes, tbRes, entriesRes] = results;

    if (pnlRes.status === 'fulfilled' && pnlRes.value.success) {
      setNetProfit(Number(pnlRes.value.data.netProfit ?? 0));
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounting"
        subtitle="Financial overview of your business"
        breadcrumbs={[{ label: 'Accounting' }]}
        actions={
          <Button size="sm" href="/accounting/journal-entries/new">
            <i className="bx bx-plus" aria-hidden="true"></i>
            New Journal Entry
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <CardSkeleton count={3} />
        ) : (
          <>
            <StatCard
              label="Net Profit (this month)"
              value={formatMoney(netProfit ?? 0, currency)}
              icon="bx-trending-up"
              tone={(netProfit ?? 0) >= 0 ? 'success' : 'error'}
              caption={`${formatDate(firstOfMonthIso())} – ${formatDate(todayIso())}`}
            />
            <StatCard
              label="Outstanding Receivables"
              value={formatMoney(outstandingAr ?? 0, currency)}
              icon="bx-receipt"
              tone="warning"
              caption="Unpaid invoice balances"
            />
            <StatCard
              label="Cash & Bank"
              value={formatMoney(cashAndBank ?? 0, currency)}
              icon="bx-wallet"
              tone="info"
              caption="Accounts 1000 / 1010"
            />
          </>
        )}
      </div>

      {/* Income vs expenses */}
      <Card title="Income vs expenses" subtitle="Last 6 months">
        <GroupedBarChart data={monthlySeries} formatValue={(v) => formatMoney(v, currency)} />
      </Card>

      {/* Report quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportLinks.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 hover:ring-brand-300 dark:hover:ring-brand-700 transition-shadow duration-150 group"
          >
            <div className="h-10 w-10 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-3">
              <i className={`bx ${report.icon} text-xl text-brand-600 dark:text-brand-400`} aria-hidden="true"></i>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {report.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
          </Link>
        ))}
      </div>

      {/* Recent journal entries */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Journal Entries</h2>
        <Link
          href="/accounting/journal-entries"
          className="text-[13px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
        >
          View all <i className="bx bx-chevron-right" aria-hidden="true"></i>
        </Link>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : recentEntries.length === 0 ? (
        <EmptyState
          icon="bx-book"
          title="No journal entries yet"
          description="Create your first journal entry to start recording transactions"
          actions={
            <Link
              href="/accounting/journal-entries/new"
              className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 flex items-center"
            >
              New Journal Entry
            </Link>
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Entry #</th>
                  <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Memo</th>
                  <th className="px-6 py-2.5 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                {recentEntries.map((entry) => {
                  const status = entryStatusVariant[entry.status] ?? entryStatusVariant.DRAFT;
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => router.push(`/accounting/journal-entries/${entry.id}`)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-white">
                        {entry.entryNumber}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300">{formatDate(entry.date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{entry.memo || '-'}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-right text-gray-700 dark:text-gray-300">
                        {formatMoney(entryTotal(entry), currency)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <StatusBadge variant={status.variant} label={status.label} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
