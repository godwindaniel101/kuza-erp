import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { downloadCsv, formatNumber } from '@/lib/format';

const AVATAR_TONES = [
  'bg-accent-soft text-accent',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
];

function LeaveTypeIcon({ i }: { i: number }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${AVATAR_TONES[i % AVATAR_TONES.length]}`} aria-hidden="true">
      <i className="bx bx-calendar-event text-base"></i>
    </span>
  );
}

export default function LeaveTypesPage() {
  const { t } = useTranslation('common');
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/leave-types');
      if (response.success) {
        setLeaveTypes(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/hrms/leave-types/${id}`);
      await loadLeaveTypes();
    } catch (err: any) {
      alert(err.message || t('deleteFailed'));
    }
  };

  const handleExport = () => {
    downloadCsv(
      'leave-types.csv',
      ['Name', 'Code', 'Max Days', 'Accrues', 'Status'],
      leaveTypes.map((lt) => [
        lt.name || '',
        lt.code || '',
        lt.maxDaysPerYear ?? '',
        lt.accrues ? 'Yes' : 'No',
        lt.isActive ? 'Active' : 'Inactive',
      ]),
    );
  };

  return (
      <div className="space-y-6 kz-stagger">
        <PageHeader
          title={t('leaveTypes') || 'Leave Types'}
          subtitle="The kinds of leave your team can take"
          count={loading ? undefined : leaveTypes.length}
          breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('leaveTypes') || 'Leave Types' }]}
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={handleExport} disabled={loading || leaveTypes.length === 0}>
                <i className="bx bx-download"></i>
                {t('export') === 'export' ? 'Export' : t('export')}
              </Button>
              <PermissionGuard permission="leaveTypes.create">
                <Button size="sm" href="/hrms/leave-types/create">
                  <i className="bx bx-plus"></i>
                  {t('addLeaveType')}
                </Button>
              </PermissionGuard>
            </>
          }
        />

        <Card>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : leaveTypes.length === 0 ? (
            <div className="text-center py-12">
              <i className="bx bx-calendar text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{t('noLeaveTypes')}</p>
              <PermissionGuard permission="leaveTypes.create">
                <Button href="/hrms/leave-types/create">
                  <i className="bx bx-plus"></i>
                  {t('addLeaveType')}
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('name')}</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('code')}</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('maxDays')}</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('accrues')}</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('status')}</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {leaveTypes.map((leaveType, idx) => (
                    <tr key={leaveType.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <LeaveTypeIcon i={idx} />
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{leaveType.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{leaveType.code || '—'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">
                        {leaveType.maxDaysPerYear != null ? formatNumber(leaveType.maxDaysPerYear) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge variant={leaveType.accrues ? 'info' : 'warning'} label={leaveType.accrues ? t('yes') : t('no')} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge variant={leaveType.isActive ? 'success' : 'info'} label={leaveType.isActive ? t('active') : t('inactive')} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <PermissionGuard permission="leaveTypes.edit">
                            <Link
                              href={`/hrms/leave-types/${leaveType.id}/edit`}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <i className="bx bx-edit"></i>
                            </Link>
                          </PermissionGuard>
                          <PermissionGuard permission="leaveTypes.delete">
                            <button
                              onClick={() => handleDelete(leaveType.id)}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            >
                              <i className="bx bx-trash"></i>
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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
