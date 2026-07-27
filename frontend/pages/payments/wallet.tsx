import { useCallback, useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney, formatDateTime } from '@/lib/format';

interface WalletEntry {
  id: string;
  direction: 'credit' | 'debit';
  amount: number | string;
  balanceAfter: number | string;
  type: string;
  counterpartyName: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
}
interface Wallet {
  id: string;
  tenantId: string;
  balance: number;
  currency: string;
  entries: WalletEntry[];
}

export default function WalletPage() {
  const { t } = useTranslation('common');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Wallet }>('/network/wallet');
      if (res.success) setWallet(res.data);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currency = wallet?.currency || 'NGN';
  const balance = Math.max(0, Number(wallet?.balance ?? 0)); // wallet is never negative

  return (
    <div className="space-y-5">
      <PageHeader title={t('wallet.title', 'Wallet')} subtitle={t('wallet.subtitle', 'Your balance and payment history.')} />

      {/* Balance card */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        {loading ? (
          <div className="h-16 flex items-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-brand-600" />
          </div>
        ) : (
          <>
            <p className="text-2xs uppercase tracking-wide text-gray-400">{t('wallet.availableBalance', 'Available balance')}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {formatMoney(balance, currency)}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('wallet.helperNonNeg', 'Top up to pay suppliers from your wallet. Withdrawals coming soon.')}
            </p>
          </>
        )}
      </section>

      {/* Ledger */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('wallet.ledger', 'Ledger')}</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-brand-600" />
          </div>
        ) : !wallet || wallet.entries.length === 0 ? (
          <EmptyState
            icon="bx-wallet"
            title={t('wallet.noEntriesTitle', 'No transactions yet')}
            description={t('wallet.noEntriesDesc', 'Wallet payments to and from suppliers will appear here.')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr className="text-left text-2xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="px-5 py-2.5">{t('date', 'Date')}</th>
                  <th className="px-5 py-2.5">{t('wallet.type', 'Type')}</th>
                  <th className="px-5 py-2.5">{t('wallet.counterparty', 'Counterparty')}</th>
                  <th className="px-5 py-2.5 text-right">{t('wallet.amount', 'Amount')}</th>
                  <th className="px-5 py-2.5 text-right">{t('wallet.balanceAfter', 'Balance after')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {wallet.entries.map((e) => {
                  const credit = e.direction === 'credit';
                  return (
                    <tr key={e.id}>
                      <td className="px-5 py-2.5 whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {formatDateTime(e.createdAt)}
                      </td>
                      <td className="px-5 py-2.5 text-gray-800 dark:text-gray-200">{e.type}</td>
                      <td className="px-5 py-2.5 text-gray-800 dark:text-gray-200">{e.counterpartyName || '—'}</td>
                      <td
                        className={`px-5 py-2.5 text-right tabular-nums font-medium ${
                          credit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {credit ? '+' : '−'}
                        {formatMoney(e.amount, currency)}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {formatMoney(e.balanceAfter, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
