import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, todayIso, downloadCsv, useCurrency } from '@/lib/format';

interface BsLine {
  code: string;
  name: string;
  amount: number;
}

interface BalanceSheetData {
  assets: BsLine[];
  liabilities: BsLine[];
  equity: BsLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  retainedEarnings: number;
  balanced: boolean;
}

function Section({
  title,
  lines,
  total,
  currency,
  extraLine,
}: {
  title: string;
  lines: BsLine[];
  total: number;
  currency: string;
  extraLine?: { name: string; amount: number };
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {lines.length === 0 && !extraLine ? (
            <tr>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400" colSpan={2}>
                No balances
              </td>
            </tr>
          ) : (
            <>
              {lines.map((line) => (
                <tr key={line.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm">
                    <span className="tabular-nums text-gray-500 dark:text-gray-400 mr-2">{line.code}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{line.name}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums text-gray-700 dark:text-gray-300">
                    {formatMoney(line.amount, currency)}
                  </td>
                </tr>
              ))}
              {extraLine && (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white italic">{extraLine.name}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums text-gray-700 dark:text-gray-300 italic">
                    {formatMoney(extraLine.amount, currency)}
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
        <tfoot className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Total {title}</td>
            <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums text-gray-900 dark:text-white">
              {formatMoney(total, currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function BalanceSheetPage() {
  const currency = useCurrency();
  const [asOf, setAsOf] = useState(todayIso());
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: BalanceSheetData }>(
        `/accounting/reports/balance-sheet?asOf=${asOf}`,
      );
      if (res.success) setData(res.data);
    } catch (err: any) {
      console.error('Failed to load balance sheet:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load balance sheet', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      `balance-sheet-${asOf}.csv`,
      ['Section', 'Code', 'Account', 'Amount'],
      [
        ...data.assets.map((l) => ['Assets', l.code, l.name, Number(l.amount).toFixed(2)]),
        ['Assets', '', 'TOTAL ASSETS', Number(data.totalAssets).toFixed(2)],
        ...data.liabilities.map((l) => ['Liabilities', l.code, l.name, Number(l.amount).toFixed(2)]),
        ['Liabilities', '', 'TOTAL LIABILITIES', Number(data.totalLiabilities).toFixed(2)],
        ...data.equity.map((l) => ['Equity', l.code, l.name, Number(l.amount).toFixed(2)]),
        ['Equity', '', 'Retained Earnings', Number(data.retainedEarnings).toFixed(2)],
        ['Equity', '', 'TOTAL EQUITY', Number(data.totalEquity).toFixed(2)],
      ],
    );
  };

  const hasData =
    !!data && (data.assets.length > 0 || data.liabilities.length > 0 || data.equity.length > 0);
  const liabPlusEquity = (data?.totalLiabilities ?? 0) + (data?.totalEquity ?? 0);

  return (
    <div className="w-full max-w-5xl space-y-6 kz-stagger">
      <PageHeader
        title="Balance Sheet"
        subtitle={`As of ${formatDate(asOf)}`}
        breadcrumbs={[
          { label: 'Accounting', href: '/accounting' },
          { label: 'Reports', href: '/accounting/reports' },
          { label: 'Balance Sheet' },
        ]}
        actions={
          <>
            <div className="flex items-center gap-2">
              <label htmlFor="bs-asof" className="text-[13px] text-gray-500 dark:text-gray-400">
                As of
              </label>
              <input
                id="bs-asof"
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={!hasData}>
              <i className="bx bx-download"></i>
              Export CSV
            </Button>
          </>
        }
      />

      {/* Balanced indicator */}
      {!loading && data && hasData && (
        <div
          className={`px-4 py-3 rounded-xl ring-1 text-sm font-medium flex items-center justify-between gap-2 flex-wrap ${
            data.balanced
              ? 'bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-500/10 ring-red-200 dark:ring-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <i className={`bx ${data.balanced ? 'bx-check-circle' : 'bx-error-circle'} text-lg`} aria-hidden="true"></i>
            {data.balanced ? 'Balanced — assets equal liabilities plus equity' : 'Not balanced'}
          </span>
          <span className="tabular-nums">
            Assets {formatMoney(data.totalAssets, currency)} vs L+E {formatMoney(liabPlusEquity, currency)}
          </span>
        </div>
      )}

      {loading ? (
        <div className="w-full max-w-5xl space-y-4">
          <TableSkeleton rows={3} columns={2} />
          <TableSkeleton rows={3} columns={2} />
          <TableSkeleton rows={3} columns={2} />
        </div>
      ) : !hasData ? (
        <EmptyState
          icon="bx-spreadsheet"
          title="No balances to report"
          description="Post journal entries to see the balance sheet"
        />
      ) : (
        <div className="space-y-6 max-w-4xl">
          <Section title="Assets" lines={data!.assets} total={data!.totalAssets} currency={currency} />
          <Section title="Liabilities" lines={data!.liabilities} total={data!.totalLiabilities} currency={currency} />
          <Section
            title="Equity"
            lines={data!.equity}
            total={data!.totalEquity}
            currency={currency}
            extraLine={{ name: 'Retained Earnings', amount: data!.retainedEarnings }}
          />
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
