import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import Icon from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';

const statusVariant: Record<string, { variant: StatusBadgeVariant; label: string }> = {
  pending: { variant: 'pending', label: 'Pending' },
  in_transit: { variant: 'info', label: 'In transit' },
  received: { variant: 'success', label: 'Received' },
  cancelled: { variant: 'rejected', label: 'Cancelled' },
};

export default function TransferDetailPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [transfer, setTransfer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<{ success: boolean; data: any }>(`/ims/transfers/${id}`);
      if (res.success) setTransfer(res.data);
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('transfers.loadFailed', 'Failed to load transfer'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      const res = await api.post(`/ims/transfers/${id}/status`, { status });
      if (res.success) {
        setToast({ message: t('transfers.updated', 'Transfer updated'), type: 'success' });
        await load();
      }
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('transfers.updateFailed', 'Failed to update transfer'), type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const statusLabels: Record<string, string> = {
    pending: t('pending', 'Pending'),
    in_transit: t('inTransit', 'In Transit'),
    received: t('received', 'Received'),
    cancelled: t('cancelled', 'Cancelled'),
  };

  const status = transfer ? statusVariant[transfer.status] ?? statusVariant.pending : null;
  const statusLabel = transfer ? statusLabels[transfer.status] || status?.label : undefined;

  return (
    <PermissionGuard permission="inventory.view">
      <div className="w-full max-w-4xl kz-stagger">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <PageHeader
          title={transfer ? t('transfers.detailTitle', 'Transfer {{number}}', { number: transfer.transferNumber }) : t('transfers.transfer', 'Transfer')}
          subtitle={t('transfers.subtitleDetail', 'Stock moved between branches')}
          breadcrumbs={[
            { label: t('inventory', 'Inventory'), href: '/ims' },
            { label: t('transfers', 'Transfers'), href: '/ims/transfers' },
            { label: transfer?.transferNumber || t('transfers.detail', 'Detail') },
          ]}
          actions={
            transfer ? (
              <div className="flex items-center gap-2">
                {status && <StatusBadge variant={status.variant} label={statusLabel || status.label} size="lg" />}
                {transfer.status === 'pending' && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setStatus('cancelled')} loading={busy}>
                      {t('transfers.decline', 'Decline')}
                    </Button>
                    <Button size="sm" onClick={() => setStatus('in_transit')} loading={busy}>
                      {t('transfers.approveSend', 'Approve & send')}
                    </Button>
                  </>
                )}
                {transfer.status === 'in_transit' && (
                  <Button size="sm" onClick={() => setStatus('received')} loading={busy}>
                    {t('receive', 'Receive')}
                  </Button>
                )}
              </div>
            ) : undefined
          }
        />

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">{t('loading', 'Loading…')}</div>
        ) : !transfer ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800">
            <p className="text-red-600 dark:text-red-400">{t('transfers.notFound', 'Transfer not found')}</p>
            <Link href="/ims/transfers" className="mt-3 inline-block text-accent hover:underline">
              {t('transfers.backToTransfers', 'Back to Transfers')}
            </Link>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('transfers.fromBranchLabel', 'From branch')}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
                  <Icon name="building-storefront" size={16} className="text-gray-400" /> {transfer.fromBranch?.name || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('transfers.toBranchLabel', 'To branch')}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
                  <Icon name="building-storefront" size={16} className="text-gray-400" /> {transfer.toBranch?.name || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('date', 'Date')}</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {transfer.transferDate ? formatDate(transfer.transferDate) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('notes', 'Notes')}</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{transfer.notes || '—'}</p>
              </div>
            </div>

            {/* Items */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('item', 'Item')}</th>
                      <th className="px-6 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('quantity', 'Quantity')}</th>
                      <th className="px-6 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('received', 'Received')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(transfer.items || []).map((item: any, i: number) => (
                      <tr key={item.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-3 text-[13px] font-medium text-gray-900 dark:text-white">
                          {item.inventoryItem?.name || item.itemName || '—'}
                        </td>
                        <td className="px-6 py-3 text-right text-[13px] tabular-nums text-gray-700 dark:text-gray-300">
                          {Number(item.quantity || 0).toLocaleString()} {item.uom?.name || item.inventoryItem?.baseUom?.name || ''}
                        </td>
                        <td className="px-6 py-3 text-right text-[13px] tabular-nums text-gray-700 dark:text-gray-300">
                          {item.receivedQuantity != null ? Number(item.receivedQuantity).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {(transfer.items || []).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-400">
                          {t('transfers.noItems', 'No items on this transfer.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
