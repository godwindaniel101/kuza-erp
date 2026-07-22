import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/Card';
import PermissionPicker from '@/components/access-control/PermissionPicker';

export default function PermissionsPage() {
  const { t } = useTranslation('common');

  return (
    <PermissionGuard permission="roles.view">
      <div className="w-full max-w-5xl space-y-5">
        <PageHeader
          title={t('permissions')}
          subtitle="Browse every permission available across your enabled apps"
          breadcrumbs={[
            { label: t('settings') || 'Settings', href: '/settings' },
            { label: t('permissions') },
          ]}
        />

        <Card>
          {/* Read-only browse: no selection, just grouped-by-app listing. */}
          <PermissionPicker value={[]} onChange={() => {}} readOnly />
        </Card>
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
