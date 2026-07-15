import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

export default function RecruitmentPage() {
  const { t } = useTranslation('common');
  const [postings, setPostings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [postingsRes, applicationsRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/hrms/recruitment/postings'),
        api.get<{ success: boolean; data: any[] }>('/hrms/recruitment/applications'),
      ]);
      if (postingsRes.success) setPostings(postingsRes.data);
      if (applicationsRes.success) setApplications(applicationsRes.data);
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('recruitment')}
        subtitle="Open roles and the applicants in play"
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('recruitment') }]}
      />
      {loading ? (
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('jobPostings')}</h2>
              <PermissionGuard permission="recruitment.create">
                <Button href="/hrms/recruitment/postings/create" size="sm">
                  <i className="bx bx-plus"></i>
                  {t('create')} {t('jobPosting')}
                </Button>
              </PermissionGuard>
            </div>
            {postings.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-2">
                    <i className="bx bx-briefcase text-gray-400 dark:text-gray-500 text-xl"></i>
                  </div>
                  <h3 className="text-gray-900 dark:text-gray-100 font-medium text-sm">{t('noRecords')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No job postings found</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {postings.map((posting) => (
                  <div key={posting.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{posting.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{posting.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('applications')}</h2>
            {applications.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                  <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-2">
                    <i className="bx bx-file text-gray-400 dark:text-gray-500 text-xl"></i>
                  </div>
                  <h3 className="text-gray-900 dark:text-gray-100 font-medium text-sm">{t('noRecords')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No applications found</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('name')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('email')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('position')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t('status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {app.firstName} {app.lastName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{app.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {app.jobPosting?.title || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              app.status === 'approved'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                : app.status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
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

