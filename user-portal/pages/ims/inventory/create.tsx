import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import PermissionGuard from '@/components/PermissionGuard';
import InventoryItemForm from '@/components/InventoryItemForm';
import PageHeader from '@/components/ui/PageHeader';

export default function CreateInventoryItemPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const base = router.pathname.startsWith('/rms/items') ? '/rms/items' : '/ims/inventory';

  return (
    <PermissionGuard permission="inventory.create">
      <div className="w-full max-w-3xl space-y-6 kz-stagger">
        <PageHeader
          title={<>{t('add')} {t('item')}</>}
          subtitle={t('inventory.createSubtitle', 'Add a new item to your catalog')}
          breadcrumbs={[
            { label: t('inventory') || 'Inventory', href: base },
            { label: t('add') || 'Add' },
          ]}
        />
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
