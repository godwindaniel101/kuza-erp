import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import InventoryItemForm from '@/components/InventoryItemForm';

export default function EditInventoryItemPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>(`/ims/inventory/${id}`);
      if (response.success && response.data) {
        setItem(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load item:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">{t('itemNotFound') || 'Item not found'}</p>
          <Link href="/ims/inventory" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
            {t('backToInventory') || 'Back to Inventory'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="inventory.edit">
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        <div className="mb-6">
          <Link href="/ims/inventory" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
            ← {t('backToInventory') || 'Back to Inventory'}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {t('edit')} {t('item')}: {item.name}
          </h1>
        </div>
        <InventoryItemForm itemId={id as string} initialData={item} />
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
