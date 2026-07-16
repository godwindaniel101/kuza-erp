import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, firstOfMonthIso, todayIso, downloadCsv, useCurrency } from '@/lib/format';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface LedgerRow {
  date: string;
  entryNumber: string;
  memo?: string;
  description?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface LedgerData {
  account: { id?: string; code?: string; name?: string } | string;
  openingBalance: number;
  rows: LedgerRow[];
  closingBalance: number;
}

export default function GeneralLedgerPage() {
  const currency = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState(firstOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await api.get<{ success: boolean; data: Account[] }>('/accounting/accounts');
        if (res.success) setAccounts(res.data || []);
      } catch (err: any) {
        console.error('Failed to load accounts:', err);
        setToast({ message: err.response?.data?.message || 'Failed to load accounts', type: 'error' });
      }
    };
    loadAccounts();
  }, []);

  const loadLedger = useCallback(async () => {
    if (!accountId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: LedgerData }>(
        `/accounting/reports/general-ledger?accountId=${accountId}&from=${from}&to=${to}`,
      );
      if (res.success) setData(res.data);
    } catch (err: any) {
      console.error('Failed to load general ledger:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load general ledger', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [accountId, from, to]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      `general-ledger-${selectedAccount?.code || accountId}-${from}-to-${to}.csv`,
      ['Date', 'Entry #', 'Memo', 'Description', 'Debit', 'Credit', 'Balance'],
      [
        ['', '', 'Opening balance', '', '', '', Number(data.openingBalance).toFixed(2)],
        ...data.rows.map((r) => [
          r.date,
          r.entryNumber,
          r.memo ?? '',
          r.description ?? '',
          Number(r.debit).toFixed(2),
          Number(r.credit).toFixed(2),
          Number(r.runningBalance).toFixed(2),
        ]),
        ['', '', 'Closing balance', '', '', '', Number(data.closingBalance).toFixed(2)],
      ],
    );
  };

  return (
    <div className="w-full max-w-5xl space-y-5">
      <PageHeader
        title="General Ledger"
        subtitle={selectedAccount ? `${selectedAccount.code} — ${selectedAccount.name}` : 'Select an account to view its activity'}
        breadcrumbs={[
          { label: 'Accounting', href: '/accounting' },
          { label: 'Reports', href: '/accounting/reports' },
          { label: 'General Ledger' },
        ]}
        actions={
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={!data || data.rows.length === 0}>
            <i className="bx bx-download"></i>
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
        <div className="w-full sm:w-80">
          <SearchableSelect
            options={accounts
              .slice()
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
            value={accountId}
            onChange={setAccountId}
            placeholder="Select account..."
            focusColor="red"
            size="sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 dark:text-gray-400">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
          />
          <label className="text-sm text-gray-500 dark:text-gray-400">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
          />
        </div>
      </div>

      {!accountId ? (
        <EmptyState
          icon="bx-book-open"
          title="Select an account"
          description="Choose an account and date range to view its ledger"
        />
      ) : loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : !data ? (
        <EmptyState icon="bx-book-open" title="No ledger data" description="Try a different date range" />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Entry #</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Memo / Description</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Debit</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Credit</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr className="bg-gray-50/60 dark:bg-gray-900/40">
                  <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 italic">
                    Opening balance
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {formatMoney(data.openingBalance, currency)}
                  </td>
                </tr>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                      No transactions in this period
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row, i) => (
                    <tr key={`${row.entryNumber}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{row.entryNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {row.description || row.memo || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                        {Number(row.debit) !== 0 ? formatMoney(row.debit, currency) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                        {Number(row.credit) !== 0 ? formatMoney(row.credit, currency) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                        {formatMoney(row.runningBalance, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    Closing balance
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                    {formatMoney(data.closingBalance, currency)}
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
