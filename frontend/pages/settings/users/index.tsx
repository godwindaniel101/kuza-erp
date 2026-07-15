import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Link from 'next/link';
import Toast from '@/components/Toast';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

export default function UsersPage() {
  const { t } = useTranslation('common');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/users');
      if (response.success) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm(t('confirmDelete'))) {
      try {
        await api.delete(`/users/${id}`);
        await loadUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
      }
    }
  };

  return (
    <div className="space-y-5">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <PageHeader
        title={t('users')}
        subtitle="Who can sign in and what they can do"
        count={loading ? undefined : users.length}
        breadcrumbs={[{ label: t('settings') || 'Settings' }, { label: t('users') }]}
        actions={
          <PermissionGuard permission="users.create">
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <i className="bx bx-plus"></i>
              <span>{t('add')} {t('user')}</span>
            </Button>
          </PermissionGuard>
        }
      />

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <i className="bx bx-user text-gray-400 dark:text-gray-500 text-2xl"></i>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('noUsersYet')}</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">{t('add')} {t('users').toLowerCase()}</p>
          <PermissionGuard permission="users.create">
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <i className="bx bx-plus"></i>
              <span>{t('add')} {t('user')}</span>
            </Button>
          </PermissionGuard>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('name')}</th>
                  <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('email')}</th>
                  <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('roles')}</th>
                  <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                {users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">{user.email}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                        {user.roles?.map((r: any) => r.name).join(', ') || '-'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {user.isActive ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                            {t('active')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                            {t('inactive')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium">
                        <PermissionGuard permission="users.edit">
                          <Link
                            href={`/settings/users/edit/${user.id}`}
                            className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mr-4"
                          >
                            {t('edit')}
                          </Link>
                        </PermissionGuard>
                        <PermissionGuard permission="users.delete">
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            {t('delete')}
                          </button>
                        </PermissionGuard>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(users.length / itemsPerPage)}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={users.length}
            startIndex={(currentPage - 1) * itemsPerPage}
            endIndex={Math.min(currentPage * itemsPerPage, users.length)}
          />
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('add')} {t('user')}</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder={t('name')}
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
              />
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder={t('email')}
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder={t('password')}
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="h-9 px-4 inline-flex items-center border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-md text-[13px]" onClick={() => setShowCreate(false)}>{t('cancel')}</button>
              <button
                className="h-9 px-3.5 inline-flex items-center text-[13px] font-medium bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors disabled:opacity-50"
                disabled={!newUser.name || !newUser.email || !newUser.password || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const res = await api.post('/users', newUser);
                    if (res.success) {
                      setShowCreate(false);
                      setNewUser({ name: '', email: '', password: '' });
                      await loadUsers();
                      setToast({ message: t('userCreated') || 'User created successfully', type: 'success' });
                    }
                  } catch (err) {
                    console.error('Failed to create user:', err);
                    setToast({ message: t('failedToCreateUser') || 'Failed to create user', type: 'error' });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? t('saving') || 'Saving...' : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
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

