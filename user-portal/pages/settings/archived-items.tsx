import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/Toast';

interface ArchivedItem {
  id: string;
  name: string;
  category?: { name?: string } | null;
  salePrice?: number | string | null;
  archivedAt?: string | null;
  frontImage?: string | null;
}

/**
 * Configuration → Archived items. Lists soft-archived inventory items and lets
 * an authorized user restore them back to the active catalogue. Archiving keeps
 * all history (batches, movements, orders); restoring simply unhides the item.
 */
export default function ArchivedItemsPage() {
  const { t } = useTranslation('common');
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [currency, setCurrency] = useState('NGN');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: ArchivedItem[] }>(
        '/ims/inventory?status=archived',
      );
      setItems(res.success && Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || err?.message || t('inventory.loadArchivedFailed', 'Failed to load archived items'),
        type: 'error',
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    api
      .get<{ success: boolean; data: { currency_code?: string; currency?: string } }>('/settings')
      .then((res) => {
        if (res?.success) setCurrency(res.data?.currency_code || res.data?.currency || 'NGN');
      })
      .catch(() => {
        /* non-fatal — default currency stays NGN */
      });
  }, [load]);

  const handleRestore = async (item: ArchivedItem) => {
    setRestoringId(item.id);
    try {
      await api.patch(`/ims/inventory/${item.id}/restore`, {});
      setToast({ message: t('inventory.restoredSuccessfully', 'Item restored'), type: 'success' });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || err?.message || t('inventory.restoreFailed', 'Failed to restore item'),
        type: 'error',
      });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.archivedItems', 'Archived items')}
        count={loading ? undefined : items.length}
        subtitle={t('inventory.archivedItemsDescription', 'Items you archived are hidden from your catalogue but keep all history. Restore any of them here.')}
        breadcrumbs={[
          { label: t('configuration', 'Configuration') },
          { label: t('inventory.archivedItems', 'Archived items') },
        ]}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="bx-archive"
          title={t('inventory.noArchivedItems', 'Nothing archived')}
          description={t('inventory.noArchivedItemsDesc', 'Items you archive from your catalogue will appear here, ready to restore.')}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">{t('name', 'Name')}</th>
                <th className="px-4 py-3 font-medium">{t('category', 'Category')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('price', 'Price')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-200">
                    {formatMoney(item.salePrice ?? 0, currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PermissionGuard permission="inventory.edit">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestore(item)}
                        disabled={restoringId === item.id}
                      >
                        <i className="bx bx-archive-out"></i>
                        {restoringId === item.id ? t('inventory.restoring', 'Restoring…') : t('inventory.restore', 'Restore')}
                      </Button>
                    </PermissionGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
