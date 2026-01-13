import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Card from '@/components/Card';

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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200', text: t('pending') || 'Pending' },
      in_transit: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200', text: t('inTransit') || 'In Transit' },
      received: { bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', text: t('received') || 'Received' },
      cancelled: { bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', text: t('cancelled') || 'Cancelled' },
    };

    const statusStyle = statusMap[status] || statusMap.pending;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg}`}>
        {statusStyle.text}
      </span>
    );
  };

  if (loading) {
    return (
      <PermissionGuard permission="inventory.view">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="inventory.view">
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('inventoryTransfers') || 'Inventory Transfers'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('manageBranchTransfers') || 'Manage inventory transfers between branches'}
            </p>
          </div>
          <Link
            href="/ims/transfers/create"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <i className="bx bx-plus"></i>
            {t('createTransfer') || 'Create Transfer'}
          </Link>
        </div>

        {transfers.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <i className="bx bx-transfer text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{t('noTransfersYet') || 'No transfers yet'}</p>
              <Link
                href="/ims/transfers/create"
                className="inline-flex items-center px-6 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition"
              >
                <i className="bx bx-plus mr-2"></i>
                {t('createTransfer') || 'Create Transfer'}
              </Link>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('transferNumber') || 'Transfer #'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('fromBranch') || 'From'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('toBranch') || 'To'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('date')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('items')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('status')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/ims/transfers/${transfer.id}`}
                          className="text-red-600 dark:text-red-400 hover:underline font-medium"
                        >
                          {transfer.transferNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {transfer.fromBranch?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {transfer.toBranch?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {transfer.transferDate ? new Date(transfer.transferDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {transfer.items?.length || 0} {t('items') || 'items'}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(transfer.status)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {transfer.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(transfer.id, 'in_transit')}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title={t('markInTransit') || 'Mark In Transit'}
                              >
                                <i className="bx bx-send text-lg"></i>
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(transfer.id, 'cancelled')}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title={t('cancel')}
                              >
                                <i className="bx bx-x text-lg"></i>
                              </button>
                            </>
                          )}
                          {transfer.status === 'in_transit' && (
                            <Link
                              href={`/ims/transfers/${transfer.id}/receive`}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title={t('receive') || 'Receive'}
                            >
                              <i className="bx bx-check-circle text-lg"></i>
                            </Link>
                          )}
                          {(transfer.status === 'pending' || transfer.status === 'cancelled') && (
                            <button
                              onClick={() => handleDelete(transfer.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
          </Card>
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

