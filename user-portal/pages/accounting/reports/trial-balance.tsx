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

interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

interface TrialBalanceData {
  asOf: string;
  rows: TrialBalanceRow[];
  totals: { debit: number; credit: number };
}

export default function TrialBalancePage() {
  const currency = useCurrency();
  const [asOf, setAsOf] = useState(todayIso());
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: TrialBalanceData }>(
        `/accounting/reports/trial-balance?asOf=${asOf}`,
      );
      if (res.success) setData(res.data);
    } catch (err: any) {
      console.error('Failed to load trial balance:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load trial balance', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const balanced = data ? Math.abs(Number(data.totals.debit) - Number(data.totals.credit)) < 0.005 : false;

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      `trial-balance-${asOf}.csv`,
      ['Code', 'Account', 'Type', 'Debit', 'Credit'],
      [
        ...data.rows.map((r) => [r.code, r.name, r.type, Number(r.debit).toFixed(2), Number(r.credit).toFixed(2)]),
        ['', 'TOTALS', '', Number(data.totals.debit).toFixed(2), Number(data.totals.credit).toFixed(2)],
      ],
    );
  };

  return (
    <div className="w-full max-w-5xl space-y-6 kz-stagger">
      <PageHeader
        title="Trial Balance"
        subtitle={`As of ${formatDate(asOf)}`}
        breadcrumbs={[
          { label: 'Accounting', href: '/accounting' },
          { label: 'Reports', href: '/accounting/reports' },
          { label: 'Trial Balance' },
        ]}
        actions={
          <>
            <div className="flex items-center gap-2">
              <label htmlFor="tb-asof" className="text-[13px] text-gray-500 dark:text-gray-400">
                As of
              </label>
              <input
                id="tb-asof"
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={!data || data.rows.length === 0}>
              <i className="bx bx-download"></i>
              Export CSV
            </Button>
          </>
        }
      />

      {/* Balanced indicator */}
      {!loading && data && data.rows.length > 0 && (
        <div
          className={`px-4 py-3 rounded-xl ring-1 text-sm font-medium flex items-center gap-2 ${
            balanced
              ? 'bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-500/10 ring-red-200 dark:ring-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <i className={`bx ${balanced ? 'bx-check-circle' : 'bx-error-circle'} text-lg`} aria-hidden="true"></i>
          {balanced ? (
            'Balanced — total debits equal total credits'
          ) : (
            <span>
              Out of balance by{' '}
              <span className="tabular-nums">
                {formatMoney(Math.abs(Number(data.totals.debit) - Number(data.totals.credit)), currency)}
              </span>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          icon="bx-list-check"
          title="No balances to report"
          description="Post journal entries to see account balances here"
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">Code</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">Account</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400">Debit</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.rows.map((row) => (
                  <tr key={row.accountId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm tabular-nums text-gray-500 dark:text-gray-400">{row.code}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.type}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {Number(row.debit) !== 0 ? formatMoney(row.debit, currency) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {Number(row.credit) !== 0 ? formatMoney(row.credit, currency) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    Totals
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums text-gray-900 dark:text-white">
                    {formatMoney(data.totals.debit, currency)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums text-gray-900 dark:text-white">
                    {formatMoney(data.totals.credit, currency)}
                  </td>
                </tr>
              </tfoot>
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
