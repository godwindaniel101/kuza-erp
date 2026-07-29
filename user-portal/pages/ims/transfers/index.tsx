import { useState, useEffect } from 'react';
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
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { downloadCsv } from '@/lib/format';

const transferStatusVariant: Record<string, StatusBadgeVariant> = {
  pending: 'pending',
  in_transit: 'info',
  received: 'success',
  cancelled: 'rejected',
};

export default function TransfersPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/ims/transfers');
      if (response.success) {
        setTransfers(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load transfers:', err);
      setToast({ message: err.response?.data?.message || t('loadFailed') || 'Failed to load transfers', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await api.post(`/ims/transfers/${id}/status`, { status });
      if (response.success) {
        setToast({ message: t('updatedSuccessfully') || 'Status updated successfully', type: 'success' });
        await loadTransfers();
      }
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('updateFailed') || 'Failed to update status', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDelete') || 'Are you sure you want to delete this transfer?')) {
      return;
    }

    try {
      const response = await api.delete(`/ims/transfers/${id}`);
      if (response.success) {
        setToast({ message: t('deletedSuccessfully') || 'Transfer deleted successfully', type: 'success' });
        await loadTransfers();
      }
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('deleteFailed') || 'Failed to delete transfer', type: 'error' });
    }
  };

  const statusLabels: Record<string, string> = {
    pending: t('pending') || 'Pending',
    in_transit: t('inTransit') || 'In Transit',
    received: t('received') || 'Received',
    cancelled: t('cancelled') || 'Cancelled',
  };

  const getStatusBadge = (status: string) => (
    <StatusBadge
      variant={transferStatusVariant[status] || 'pending'}
      label={statusLabels[status] || status}
      size="sm"
    />
  );

  const handleExportCsv = () => {
    const headers = [
      t('transferNumber', 'Transfer #'),
      t('fromBranch', 'From'),
      t('toBranch', 'To'),
      t('date', 'Date'),
      t('items', 'Items'),
      t('status', 'Status'),
    ];
    const rows = transfers.map((tr) => [
      tr.transferNumber || '',
      tr.fromBranch?.name || '',
      tr.toBranch?.name || '',
      tr.transferDate ? new Date(tr.transferDate).toLocaleDateString() : '',
      tr.items?.length || 0,
      tr.status || '',
    ]);
    downloadCsv(`transfers-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  if (loading) {
    return (
      <PermissionGuard permission="inventory.view">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="inventory.view">
      <div className="space-y-6 kz-stagger">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={t('inventoryTransfers') || 'Inventory Transfers'}
          count={transfers.length}
          subtitle={t('manageBranchTransfers') || 'Manage inventory transfers between branches'}
          breadcrumbs={[{ label: t('inventory') || 'Inventory' }, { label: t('transfers') || 'Transfers' }]}
          actions={
            <>
              {transfers.length > 0 && (
                <Button size="sm" variant="secondary" onClick={handleExportCsv}>
                  <i className="bx bx-download"></i>
                  {t('exportCsv') || 'Export CSV'}
                </Button>
              )}
              <Button size="sm" href="/ims/transfers/create">
                <i className="bx bx-plus"></i>
                {t('createTransfer') || 'Create Transfer'}
              </Button>
            </>
          }
        />

        {transfers.length === 0 ? (
          <EmptyState
            icon="bx-transfer"
            title={t('noTransfersYet') || 'No transfers yet'}
            description={t('manageBranchTransfers') || 'Manage inventory transfers between branches'}
            actions={
              <Button size="sm" href="/ims/transfers/create">
                <i className="bx bx-plus"></i>
                {t('createTransfer') || 'Create Transfer'}
              </Button>
            }
          />
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('transferNumber') || 'Transfer #'}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('fromBranch') || 'From'}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('toBranch') || 'To'}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('date')}
                    </th>
                    <th className="px-6 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('items')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('status')}
                    </th>
                    <th className="px-6 py-2.5 text-center text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                  {transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-3 text-[13px]">
                        <Link
                          href={`/ims/transfers/${transfer.id}`}
                          className="text-accent hover:underline font-medium"
                        >
                          {transfer.transferNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-[13px] text-gray-900 dark:text-gray-100">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="building-storefront" size={16} className="text-gray-400 dark:text-gray-500" />
                          {transfer.fromBranch?.name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[13px] text-gray-900 dark:text-gray-100">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="building-storefront" size={16} className="text-gray-400 dark:text-gray-500" />
                          {transfer.toBranch?.name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[13px] text-gray-700 dark:text-gray-300">
                        {transfer.transferDate ? new Date(transfer.transferDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-3 text-right text-[13px] tabular-nums text-gray-700 dark:text-gray-300">
                        {transfer.items?.length || 0} {t('items') || 'items'}
                      </td>
                      <td className="px-6 py-3 text-[13px]">{getStatusBadge(transfer.status)}</td>
                      <td className="px-6 py-3 text-[13px] text-center">
                        <div className="flex items-center justify-center gap-2">
                          {transfer.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(transfer.id, 'in_transit')}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title={t('markInTransit') || 'Mark In Transit'}
                              >
                                <i className="bx bx-send text-lg"></i>
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(transfer.id, 'cancelled')}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title={t('cancel')}
                              >
                                <i className="bx bx-x text-lg"></i>
                              </button>
                            </>
                          )}
                          {transfer.status === 'in_transit' && (
                            <Link
                              href={`/ims/transfers/${transfer.id}`}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                              title={t('receive') || 'Receive'}
                            >
                              <i className="bx bx-check-circle text-lg"></i>
                            </Link>
                          )}
                          {(transfer.status === 'pending' || transfer.status === 'cancelled') && (
                            <button
                              onClick={() => handleDelete(transfer.id)}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title={t('delete')}
                            >
                              <i className="bx bx-trash text-lg"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

