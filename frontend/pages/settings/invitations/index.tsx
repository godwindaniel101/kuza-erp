import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';

export default function InvitationsPage() {
  const { t } = useTranslation('common');
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', roleId: '' });

  useEffect(() => {
    loadInvitations();
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

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/invitations', formData);
      setShowForm(false);
      setFormData({ email: '', roleId: '' });
      await loadInvitations();
    } catch (err) {
      console.error('Failed to send invitation:', err);
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
      <PageHeader
        title={t('invitations')}
        subtitle="Pending invites to your workspace"
        breadcrumbs={[{ label: t('settings') || 'Settings', href: '/settings' }, { label: t('invitations') }]}
        actions={
          <PermissionGuard permission="invitations.create">
            <button
              onClick={() => setShowForm(!showForm)}
              className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors inline-flex items-center"
            >
              <i className="bx bx-plus mr-2"></i>
              {t('sendInvitation')}
            </button>
          </PermissionGuard>
        }
      />

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={sendInvitation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9 w-full px-3 border border-gray-300 rounded-md text-[13px]"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 flex items-center space-x-2"
              >
                {t('send')}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('role')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sentAt')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {t('noInvitationsYet')}
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-gray-100">
                      {inv.email}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500">{inv.role?.name || '-'}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          inv.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : inv.status === 'expired'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium">
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

