import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Toast from '@/components/Toast';
import Card from '@/components/Card';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

export default function RolesPage() {
  const { t } = useTranslation('common');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      // Assuming roles endpoint exists
      const response = await api.get<{ success: boolean; data: any[] }>('/roles').catch(() => ({
        success: false,
        data: [],
      }));
      if (response.success) {
        setRoles(response.data);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (id: string) => {
    if (typeof window !== 'undefined' && window.confirm(t('confirmDelete') || 'Are you sure you want to delete this role?')) {
      try {
        const response = await api.delete(`/roles/${id}`);
        if (response.success) {
          setToast({ message: t('deletedSuccessfully') || 'Role deleted successfully', type: 'success' });
          await loadRoles();
        }
      } catch (err: any) {
        console.error('Failed to delete role:', err);
        setToast({ message: err.response?.data?.message || t('deleteFailed') || 'Failed to delete role', type: 'error' });
      }
    }
  };

  return (
    <PermissionGuard permission="roles.view">
      <div className="space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <PageHeader
          title={t('roles')}
          subtitle="Permission sets you assign to users"
          breadcrumbs={[{ label: t('settings') || 'Settings', href: '/settings' }, { label: t('roles') }]}
          actions={
            <PermissionGuard permission="roles.create">
              <Link
                href="/settings/roles/create"
                className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors inline-flex items-center"
              >
                <i className="bx bx-plus mr-2"></i>
                {t('add')} {t('role')}
              </Link>
            </PermissionGuard>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : roles.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <i className="bx bx-shield-alt-2 text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-2">{t('noRolesYet') || 'No roles yet'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('createYourFirstRole') || 'Create your first role to get started'}</p>
              <PermissionGuard permission="roles.create">
                <Link
                  href="/settings/roles/create"
                  className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
                >
                  <i className="bx bx-plus mr-2"></i>
                  {t('add')} {t('role')}
                </Link>
              </PermissionGuard>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('name')}</th>
                    <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('displayName') || 'Display Name'}
                    </th>
                    <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('permissions')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('users')}
                    </th>
                    <th className="px-6 py-2.5 text-center text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                  {roles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{role.displayName || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {role.permissions?.length || 0} {t('permissions')}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300">
                        {role.users?.length || 0} {t('users')}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-center">
                        <div className="flex items-center justify-center gap-4">
                          <PermissionGuard permission="roles.edit">
                            <Link
                              href={`/settings/roles/edit/${role.id}`}
                              className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                            >
                              {t('edit')}
                            </Link>
                          </PermissionGuard>
                          <PermissionGuard permission="roles.delete">
                            <button
                              onClick={() => deleteRole(role.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            >
                              {t('delete')}
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(roles.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={roles.length}
              startIndex={(currentPage - 1) * itemsPerPage}
              endIndex={Math.min(currentPage * itemsPerPage, roles.length)}
            />
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

