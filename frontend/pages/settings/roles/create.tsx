import { useState, useEffect } from 'react';
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

interface Permission {
  id: string;
  name: string;
  displayName: string;
  group: string;
  description?: string;
}

export default function CreateRolePage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
  });

  useEffect(() => {
    loadPermissions();
    // Reload permissions every 30 seconds to catch new additions
    const interval = setInterval(() => {
      loadPermissions();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPermissions = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Permission[] }>('/settings/permissions');
      if (response.success) {
        setPermissions(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load permissions:', err);
      setToast({ message: err.response?.data?.message || t('loadFailed') || 'Failed to load permissions', type: 'error' });
    } finally {
      setLoadingPermissions(false);
    }
  };

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

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    );
  };

  const toggleGroup = (group: string) => {
    const groupPermissions = permissions.filter((p) => p.group === group).map((p) => p.id);
    const allSelected = groupPermissions.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      // Deselect all in group
      setSelectedPermissions((prev) => prev.filter((id) => !groupPermissions.includes(id)));
    } else {
      // Select all in group
      setSelectedPermissions((prev) => {
        const newSelection = [...prev];
        groupPermissions.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.group]) {
      acc[permission.group] = [];
    }
    acc[permission.group].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

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

                {loadingPermissions ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                  </div>
                ) : permissions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">{t('noPermissionsFound') || 'No permissions found'}</p>
                  </div>
                ) : (
                  <div className="space-y-5 max-h-[600px] overflow-y-auto">
                    {Object.entries(groupedPermissions).map(([group, groupPerms]) => {
                      const allSelected = groupPerms.every((p) => selectedPermissions.includes(p.id));
                      const someSelected = groupPerms.some((p) => selectedPermissions.includes(p.id));

                      return (
                        <div key={group} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(input) => {
                                  if (input) {
                                    input.indeterminate = someSelected && !allSelected;
                                  }
                                }}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleGroup(group);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 text-blue-600 focus-visible:ring-brand-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                              />
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{group}</h3>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {groupPerms.filter((p) => selectedPermissions.includes(p.id)).length} / {groupPerms.length}
                            </span>
                          </button>

                          <div className="p-4 space-y-2">
                            {groupPerms.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(permission.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    togglePermission(permission.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1 h-4 w-4 text-blue-600 focus-visible:ring-brand-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {permission.displayName}
                                  </div>
                                  {permission.description && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {permission.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                                    {permission.name}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

