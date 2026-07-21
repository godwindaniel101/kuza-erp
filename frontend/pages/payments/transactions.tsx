import { useEffect, useState, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Toast from '@/components/Toast';
import { formatMoney, useCurrency } from '@/lib/format';

interface Tx {
  id: string;
  branchId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerReference?: string;
  paymentReference: string;
  customerName?: string;
  paidAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  awaiting: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  failed: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function PaymentTransactionsPage() {
  const { t } = useTranslation('common');
  const currency = useCurrency();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const branchName = useCallback(
    (id: string) => branches.find((b) => b.id === id)?.name || '—',
    [branches],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, branchesRes] = await Promise.all([
        api.get<{ success: boolean; data: Tx[] }>('/payments/transactions'),
        api.get<{ success: boolean; data: any[] }>('/settings/branches'),
      ]);
      if (txRes.success) setTxs(txRes.data);
      if (branchesRes.success) setBranches(branchesRes.data);
    } catch {
      setToast({ message: 'Failed to load transactions', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PermissionGuard permission="payments.view">
      <div className="space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <PageHeader title="Payment transactions" subtitle="Every payment collected across your branches" />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600"></div>
          </div>
        ) : txs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No transactions yet. They appear here as payments come in.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800/60">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {tx.providerReference || tx.paymentReference}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{branchName(tx.branchId)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{tx.customerName || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
                      {formatMoney(Number(tx.amount), currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[tx.status] || STATUS_STYLES.cancelled}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(tx.paidAt || tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
