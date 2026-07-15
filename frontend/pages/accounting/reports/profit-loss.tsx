import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, firstOfMonthIso, todayIso, downloadCsv, useCurrency } from '@/lib/format';

interface PnlLine {
  code: string;
  name: string;
  amount: number;
}

interface PnlData {
  income: PnlLine[];
  expenses: PnlLine[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

function SectionTable({
  title,
  lines,
  total,
  currency,
}: {
  title: string;
  lines: PnlLine[];
  total: number;
  currency: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{title}</h2>
      </div>
      <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {lines.length === 0 ? (
            <tr>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400" colSpan={2}>
                No activity in this period
              </td>
            </tr>
          ) : (
            lines.map((line) => (
              <tr key={line.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-6 py-3 text-sm">
                  <span className="font-mono text-gray-500 dark:text-gray-400 mr-2">{line.code}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{line.name}</span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-right text-gray-700 dark:text-gray-300">
                  {formatMoney(line.amount, currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">Total {title}</td>
            <td className="px-6 py-3 text-sm font-semibold text-right text-gray-900 dark:text-white">
              {formatMoney(total, currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function ProfitLossPage() {
  const currency = useCurrency();
  const [from, setFrom] = useState(firstOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<PnlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: PnlData }>(
        `/accounting/reports/profit-loss?from=${from}&to=${to}`,
      );
      if (res.success) setData(res.data);
    } catch (err: any) {
      console.error('Failed to load profit & loss:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load profit & loss', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      `profit-loss-${from}-to-${to}.csv`,
      ['Section', 'Code', 'Account', 'Amount'],
      [
        ...data.income.map((l) => ['Income', l.code, l.name, Number(l.amount).toFixed(2)]),
        ['Income', '', 'TOTAL INCOME', Number(data.totalIncome).toFixed(2)],
        ...data.expenses.map((l) => ['Expenses', l.code, l.name, Number(l.amount).toFixed(2)]),
        ['Expenses', '', 'TOTAL EXPENSES', Number(data.totalExpenses).toFixed(2)],
        ['', '', 'NET PROFIT', Number(data.netProfit).toFixed(2)],
      ],
    );
  };

  const hasData = !!data && (data.income.length > 0 || data.expenses.length > 0);
  const profitable = (data?.netProfit ?? 0) >= 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        title="Profit & Loss"
        subtitle={`${formatDate(from)} – ${formatDate(to)}`}
        breadcrumbs={[
          { label: 'Accounting', href: '/accounting' },
          { label: 'Reports', href: '/accounting/reports' },
          { label: 'Profit & Loss' },
        ]}
        actions={
          <>
            <div className="flex items-center gap-2">
              <label className="text-[13px] text-gray-500 dark:text-gray-400">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 px-3 text-[13px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
              />
              <label className="text-[13px] text-gray-500 dark:text-gray-400">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 px-3 text-[13px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={!hasData}
              className="h-8 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <i className="bx bx-download mr-2"></i>
              Export CSV
            </button>
          </>
        }
      />

      {loading ? (
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <TableSkeleton rows={4} columns={2} />
          <TableSkeleton rows={4} columns={2} />
        </div>
      ) : !hasData ? (
        <EmptyState
          icon="bx-line-chart"
          title="No activity in this period"
          description="Post journal entries or invoices within the date range to see results"
        />
      ) : (
        <div className="space-y-5 max-w-4xl">
          {/* Net profit banner */}
          <div
            className={`px-6 py-4 rounded-lg border flex items-center justify-between ${
              profitable
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <i
                className={`bx ${profitable ? 'bx-trending-up' : 'bx-trending-down'} text-2xl ${
                  profitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
                aria-hidden="true"
              ></i>
              <span
                className={`text-sm font-medium ${
                  profitable ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                }`}
              >
                Net {profitable ? 'Profit' : 'Loss'}
              </span>
            </div>
            <span
              className={`text-2xl font-bold ${
                profitable ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
              }`}
            >
              {formatMoney(data!.netProfit, currency)}
            </span>
          </div>

          <SectionTable title="Income" lines={data!.income} total={data!.totalIncome} currency={currency} />
          <SectionTable title="Expenses" lines={data!.expenses} total={data!.totalExpenses} currency={currency} />
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
