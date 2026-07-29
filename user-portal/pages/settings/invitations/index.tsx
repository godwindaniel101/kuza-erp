import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import Toast from '@/components/Toast';
import { downloadCsv, formatDate } from '@/lib/format';

const AVATAR_TONES = [
  'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
];

function Avatar({ name, i }: { name: string; i: number }) {
  const initials = (name || '?').slice(0, 2).toUpperCase();
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}
    >
      {initials}
    </span>
  );
}

const invitationVariant = (status?: string): StatusBadgeVariant => {
  const s = (status || '').toLowerCase();
  if (s === 'accepted') return 'success';
  if (s === 'expired') return 'error';
  return 'pending';
};

export default function InvitationsPage() {
  const { t } = useTranslation('common');
  const [invitations, setInvitations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', name: '', roleId: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadInvitations();
    loadRoles();
  }, []);

  const loadInvitations = async () => {
    try {
      // Assuming invitations endpoint exists
      const response = await api.get<{ success: boolean; data: any[] }>('/invitations').catch(() => ({
        success: false,
        data: [],
      }));
      if (response.success) {
        setInvitations(response.data);
      }
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/roles');
      if (response.success) {
        setRoles(response.data);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/invitations', {
        email: formData.email,
        ...(formData.name ? { name: formData.name } : {}),
        ...(formData.roleId ? { roleId: formData.roleId } : {}),
      });
      setShowForm(false);
      setFormData({ email: '', name: '', roleId: '' });
      await loadInvitations();
      setToast({ message: t('invitations.sent', 'Invitation sent'), type: 'success' });
    } catch (err: any) {
      console.error('Failed to send invitation:', err);
      setToast({
        message:
          err?.response?.data?.message ||
          t('invitations.sendFailed', 'Failed to send invitation'),
        type: 'error',
      });
    }
  };

  const resendInvitation = async (id: string) => {
    try {
      await api.post(`/invitations/${id}/resend`);
      await loadInvitations();
    } catch (err) {
      console.error('Failed to resend invitation:', err);
    }
  };

  const cancelInvitation = async (id: string) => {
    if (confirm(t('confirmDelete'))) {
      try {
        await api.delete(`/invitations/${id}`);
        await loadInvitations();
      } catch (err) {
        console.error('Failed to cancel invitation:', err);
      }
    }
  };

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader
        title={t('invitations')}
        subtitle={t('settings.invitationsSubtitle', 'Pending invites to your workspace')}
        breadcrumbs={[{ label: t('settings') || 'Settings', href: '/settings' }, { label: t('invitations') }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadCsv(
                  'invitations.csv',
                  [t('email'), t('role'), t('status'), t('sentAt')],
                  invitations.map((inv) => [
                    inv.email,
                    inv.role?.name || '',
                    inv.status,
                    inv.createdAt ? formatDate(inv.createdAt) : '',
                  ]),
                )
              }
              disabled={loading || invitations.length === 0}
            >
              <i className="bx bx-download"></i>
              <span>{t('export') || 'Export'} CSV</span>
            </Button>
            <PermissionGuard permission="invitations.create">
              <Button size="sm" onClick={() => setShowForm(!showForm)}>
                <i className="bx bx-plus"></i>
                <span>{t('sendInvitation')}</span>
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={sendInvitation} className="space-y-4">
            <FormField
              type="email"
              name="email"
              label={t('email')}
              required
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
            />
            <FormField
              type="text"
              name="name"
              label={t('name')}
              help={`(${t('optional') || 'optional'})`}
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder={t('fullName') || 'Full name'}
            />
            <FormField
              type="select"
              name="roleId"
              label={t('role')}
              value={formData.roleId}
              onChange={(value) => setFormData({ ...formData, roleId: value })}
              placeholder={t('selectRole') || 'Select a role'}
              options={roles.map((r) => ({ value: r.id, label: r.displayName || r.name }))}
            />
            <div className="flex space-x-3">
              <Button type="submit" variant="primary">
                {t('send')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                {t('cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('email')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('role')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('status')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('sentAt')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                    {t('noInvitationsYet')}
                  </td>
                </tr>
              ) : (
                invitations.map((inv, idx) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={inv.email || '?'} i={idx} />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {inv.role?.displayName || inv.role?.name || roles.find((r) => r.id === inv.roleId)?.displayName || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge variant={invitationVariant(inv.status)} label={inv.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {inv.status === 'pending' && (
                        <>
                          <button
                            onClick={() => resendInvitation(inv.id)}
                            className="text-brand-600 hover:text-brand-700 mr-4"
                          >
                            {t('resend')}
                          </button>
                          <button
                            onClick={() => cancelInvitation(inv.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {t('cancel')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

