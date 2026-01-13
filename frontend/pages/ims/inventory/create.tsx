import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import PermissionGuard from '@/components/PermissionGuard';
import InventoryItemForm from '@/components/InventoryItemForm';

export default function CreateInventoryItemPage() {
  const { t } = useTranslation('common');

  return (
    <PermissionGuard permission="inventory.create">
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('add')} {t('item')}
        </h1>
        <InventoryItemForm />
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
