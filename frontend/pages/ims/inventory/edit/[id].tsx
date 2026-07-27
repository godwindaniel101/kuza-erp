import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import InventoryItemForm from '@/components/InventoryItemForm';
import PageHeader from '@/components/ui/PageHeader';

export default function EditInventoryItemPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const base = router.pathname.startsWith('/rms/items') ? '/rms/items' : '/ims/inventory';
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">{t('itemNotFound') || 'Item not found'}</p>
          <Link href={base} className="text-brand-600 dark:text-brand-400 hover:underline mt-4 inline-block">
            {t('backToInventory') || 'Back to Inventory'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="inventory.edit">
      <div className="w-full max-w-3xl space-y-5">
        <PageHeader
          title={<>{t('edit')} {t('item')}: {item.name}</>}
          subtitle={t('inventory.editSubtitle', "Update this item's details and pricing")}
          breadcrumbs={[
            { label: t('inventory') || 'Inventory', href: base },
            { label: item.name },
          ]}
        />
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
