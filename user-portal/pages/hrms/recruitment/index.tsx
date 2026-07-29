import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge, { StatusBadgeVariant } from '@/components/ui/StatusBadge';
import { downloadCsv } from '@/lib/format';

const AVATAR_TONES = [
  'bg-accent-soft text-accent',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
];

function Avatar({ name, i }: { name: string; i: number }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
      {initials || 'U'}
    </span>
  );
}

const applicationVariant = (status?: string): StatusBadgeVariant => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'error';
  return 'warning';
};

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

  const handleExportApplications = () => {
    downloadCsv(
      'applications.csv',
      ['Name', 'Email', 'Position', 'Status'],
      applications.map((a) => [`${a.firstName || ''} ${a.lastName || ''}`.trim(), a.email || '', a.jobPosting?.title || '', a.status || '']),
    );
  };

  return (
    <div className="space-y-6 kz-stagger">
      <PageHeader
        title={t('recruitment')}
        subtitle="Open roles and the applicants in play"
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('recruitment') }]}
      />
      {loading ? (
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t('jobPostings')}</h2>
              <PermissionGuard permission="recruitment.create">
                <Button href="/hrms/recruitment/postings/create" size="sm">
                  <i className="bx bx-plus"></i>
                  {t('create')} {t('jobPosting')}
                </Button>
              </PermissionGuard>
            </div>
            {postings.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                  <i className="bx bx-briefcase text-gray-400 dark:text-gray-500 text-xl"></i>
                </div>
                <h3 className="font-display tracking-tight text-gray-900 dark:text-gray-100 font-medium text-sm">{t('noRecords')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No job postings found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800 -my-1">
                {postings.map((posting) => (
                  <div key={posting.id} className="py-3">
                    <h3 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">{posting.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{posting.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t('applications')}</h2>
              {applications.length > 0 && (
                <Button size="sm" variant="secondary" onClick={handleExportApplications}>
                  <i className="bx bx-download"></i>
                  {t('export') === 'export' ? 'Export' : t('export')}
                </Button>
              )}
            </div>
            {applications.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                  <i className="bx bx-file text-gray-400 dark:text-gray-500 text-xl"></i>
                </div>
                <h3 className="font-display tracking-tight text-gray-900 dark:text-gray-100 font-medium text-sm">{t('noRecords')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No applications found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {t('name')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {t('email')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {t('position')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {t('status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {applications.map((app, idx) => (
                      <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar name={`${app.firstName || ''} ${app.lastName || ''}`.trim() || '?'} i={idx} />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {app.firstName} {app.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{app.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          <span className="inline-flex items-center gap-1.5">
                            <i className="bx bx-briefcase text-gray-400"></i>
                            {app.jobPosting?.title || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge variant={applicationVariant(app.status)} label={app.status} />
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

