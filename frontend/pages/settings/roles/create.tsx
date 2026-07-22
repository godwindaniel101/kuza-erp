import { useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Toast from '@/components/Toast';
import Card from '@/components/Card';
import PermissionPicker from '@/components/access-control/PermissionPicker';

export default function CreateRolePage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/roles', {
        ...formData,
        permissionIds: selectedPermissions,
      });

      if (response.success) {
        setToast({ message: t('createdSuccessfully') || 'Role created successfully', type: 'success' });
        setTimeout(() => router.push('/settings/roles'), 500);
      }
    } catch (err: any) {
      console.error('Failed to create role:', err);
      const errorMessage = err.response?.data?.message || err.message || t('createFailed') || 'Failed to create role';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard permission="roles.create">
      <div className="w-full max-w-5xl space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={<>{t('create')} {t('role')}</>}
          subtitle="Define what this role can see and do"
          breadcrumbs={[
            { label: t('settings') || 'Settings', href: '/settings' },
            { label: t('roles') || 'Roles', href: '/settings/roles' },
            { label: t('create') || 'Create' },
          ]}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <i className="bx bx-arrow-back"></i>
              {t('back') || 'Back'}
            </Button>
          }
        />

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="lg:col-span-1">
              <Card>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('basicInformation') || 'Basic Information'}</h2>

                <div className="space-y-4">
                  <FormField
                    type="text"
                    name="name"
                    label={t('name')}
                    required
                    value={formData.name}
                    onChange={(value) => setFormData({ ...formData, name: value })}
                    placeholder="e.g., manager"
                  />

                  <FormField
                    type="text"
                    name="displayName"
                    label={t('displayName') || 'Display Name'}
                    required
                    value={formData.displayName}
                    onChange={(value) => setFormData({ ...formData, displayName: value })}
                    placeholder="e.g., Manager"
                  />

                  <FormField
                    type="textarea"
                    name="description"
                    label={t('description')}
                    help={`(${t('optional')})`}
                    rows={4}
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder={t('roleDescription') || 'Enter role description...'}
                  />
                </div>
              </Card>
            </div>

            {/* Permissions Selection */}
            <div className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('permissions')}</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedPermissions.length} {t('selected') || 'selected'}
                  </span>
                </div>

                <PermissionPicker value={selectedPermissions} onChange={setSelectedPermissions} />
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('creating') || 'Creating...'}
                </span>
              ) : (
                t('create') + ' ' + t('role')
              )}
            </Button>
          </div>
        </form>
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
