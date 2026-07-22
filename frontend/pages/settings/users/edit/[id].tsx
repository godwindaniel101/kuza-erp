import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Toast from '@/components/Toast';
import Card from '@/components/Card';

interface Role {
  id: string;
  name: string;
  displayName: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roles: Role[];
}

export default function EditUserPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (id) {
      loadUser();
      loadRoles();
    }
  }, [id]);

  const loadUser = async () => {
    try {
      const response = await api.get<{ success: boolean; data: User }>(`/users/${id}`);
      if (response.success && response.data) {
        const u = response.data;
        setUser(u);
        setName(u.name || '');
        setIsActive(!!u.isActive);
        setSelectedRoleIds((u.roles || []).map((r) => r.id));
      }
    } catch (err) {
      console.error('Failed to load user:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Role[] }>('/roles');
      if (response.success) {
        setRoles(response.data);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId],
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.patch(`/users/${id}`, {
        name,
        isActive,
        roleIds: selectedRoleIds,
      });
      if (response.success) {
        setToast({ message: t('savedSuccessfully') || 'User updated successfully', type: 'success' });
        setTimeout(() => router.push('/settings/users'), 500);
      }
    } catch (err: any) {
      console.error('Failed to update user:', err);
      const message = err.response?.data?.message || err.message || t('saveFailed') || 'Failed to update user';
      setToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('confirmDelete') || 'Are you sure you want to delete this user?')) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${id}`);
      setToast({ message: t('deletedSuccessfully') || 'User deleted', type: 'success' });
      setTimeout(() => router.push('/settings/users'), 500);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      const message = err.response?.data?.message || err.message || t('deleteFailed') || 'Failed to delete user';
      setToast({ message, type: 'error' });
      setDeleting(false);
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

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">{t('userNotFound') || 'User not found'}</p>
          <Link href="/settings/users" className="text-brand-600 dark:text-brand-400 hover:underline mt-4 inline-block">
            {t('back') || 'Back'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="users.edit">
      <div className="w-full max-w-3xl space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={<>{t('edit')} {t('user')}: {user.name || user.email}</>}
          subtitle="Update this user's profile, status and roles"
          breadcrumbs={[
            { label: t('settings') || 'Settings', href: '/settings' },
            { label: t('users') || 'Users', href: '/settings/users' },
            { label: user.name || user.email },
          ]}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <i className="bx bx-arrow-back"></i>
              {t('back') || 'Back'}
            </Button>
          }
        />

        <form onSubmit={handleSave} className="space-y-5">
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('basicInformation') || 'Basic Information'}
            </h2>
            <div className="space-y-4">
              <FormField
                type="text"
                name="name"
                label={t('name')}
                required
                value={name}
                onChange={setName}
                placeholder={t('fullName') || 'Full name'}
              />
              <FormField
                type="email"
                name="email"
                label={t('email')}
                value={user.email}
                disabled
                help={t('emailCannotBeChanged') || 'Email cannot be changed'}
              />
              <FormField
                type="checkbox"
                name="isActive"
                label={t('status')}
                checked={isActive}
                onChange={setIsActive}
                checkboxLabel={isActive ? t('active') : t('inactive')}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('roles')}</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedRoleIds.length} {t('selected') || 'selected'}
              </span>
            </div>

            {roles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">{t('noRolesFound') || 'No roles found'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="mt-0.5 h-4 w-4 text-brand-600 focus-visible:ring-brand-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {role.displayName || role.name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{role.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between gap-4">
            <PermissionGuard permission="users.delete">
              <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting || saving}>
                {deleting ? t('deleting') || 'Deleting...' : t('delete')}
              </Button>
            </PermissionGuard>
            <div className="flex items-center gap-3 ml-auto">
              <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={saving || !name}>
                {saving ? t('saving') || 'Saving...' : t('save')}
              </Button>
            </div>
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
