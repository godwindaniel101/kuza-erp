import { useEffect, useState } from 'react';
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

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: { id: string; name: string }[];
}

export default function EditRolePage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
  });

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    let cancelled = false;

    const applyRole = (role: Role) => {
      if (cancelled) return;
      setFormData({
        name: role.name || '',
        displayName: role.displayName || '',
        description: role.description || '',
      });
      setSelectedPermissions((role.permissions || []).map((p) => p.id));
    };

    const loadRole = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Role }>(`/roles/${id}`);
        if (response.success && response.data) {
          applyRole(response.data);
          return;
        }
        throw new Error('not-found');
      } catch (err) {
        // Fallback: fetch all roles and find by id.
        try {
          const list = await api.get<{ success: boolean; data: Role[] }>('/roles');
          const found = list.success ? list.data.find((r) => r.id === id) : undefined;
          if (found) {
            applyRole(found);
            return;
          }
          if (!cancelled) setNotFound(true);
        } catch (fallbackErr: any) {
          if (!cancelled) {
            setToast({
              message: fallbackErr?.response?.data?.message || t('loadFailed') || 'Failed to load role',
              type: 'error',
            });
            setNotFound(true);
          }
        }
      } finally {
        if (!cancelled) setLoadingRole(false);
      }
    };

    loadRole();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || typeof id !== 'string') return;
    setLoading(true);

    try {
      const response = await api.patch(`/roles/${id}`, {
        ...formData,
        permissionIds: selectedPermissions,
      });

      if (response.success) {
        setToast({ message: t('updatedSuccessfully') || 'Role updated successfully', type: 'success' });
        setTimeout(() => router.push('/settings/roles'), 500);
      }
    } catch (err: any) {
      console.error('Failed to update role:', err);
      const errorMessage = err.response?.data?.message || err.message || t('updateFailed') || 'Failed to update role';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard permission="roles.edit">
      <div className="w-full max-w-5xl space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={<>{t('edit')} {t('role')}</>}
          subtitle={t('settings.editRoleSubtitle', 'Update what this role can see and do')}
          breadcrumbs={[
            { label: t('settings') || 'Settings', href: '/settings' },
            { label: t('roles') || 'Roles', href: '/settings/roles' },
            { label: t('edit') || 'Edit' },
          ]}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <i className="bx bx-arrow-back"></i>
              {t('back') || 'Back'}
            </Button>
          }
        />

        {loadingRole ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : notFound ? (
          <Card>
            <div className="text-center py-12">
              <i className="bx bx-error-circle text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-2">{t('notFound') || 'Role not found'}</h3>
              <Button href="/settings/roles" variant="secondary">
                {t('back') || 'Back'}
              </Button>
            </div>
          </Card>
        ) : (
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
                      placeholder={t('settings.roleNameExample', 'e.g., manager')}
                    />

                    <FormField
                      type="text"
                      name="displayName"
                      label={t('displayName') || 'Display Name'}
                      required
                      value={formData.displayName}
                      onChange={(value) => setFormData({ ...formData, displayName: value })}
                      placeholder={t('settings.roleDisplayNameExample', 'e.g., Manager')}
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
                    {t('saving') || 'Saving...'}
                  </span>
                ) : (
                  t('save') || 'Save'
                )}
              </Button>
            </div>
          </form>
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
