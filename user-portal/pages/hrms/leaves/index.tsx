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
import { downloadCsv, formatDate } from '@/lib/format';

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

const leaveVariant = (status?: string): StatusBadgeVariant => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'error';
  return 'warning';
};

export default function LeavesPage() {
  const { t } = useTranslation('common');
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/leaves');
      if (response.success) {
        setLeaves(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      'leaves.csv',
      ['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status'],
      leaves.map((l) => [
        `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim(),
        l.leaveType?.name || '',
        l.startDate ? formatDate(l.startDate) : '',
        l.endDate ? formatDate(l.endDate) : '',
        l.days ?? '',
        l.status || '',
      ]),
    );
  };

  return (
    <div className="space-y-6 kz-stagger">
      <PageHeader
        title={t('leaves')}
        subtitle="Time-off requests and approvals"
        count={loading ? undefined : leaves.length}
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('leaves') }]}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={handleExport} disabled={loading || leaves.length === 0}>
              <i className="bx bx-download"></i>
              {t('export') === 'export' ? 'Export' : t('export')}
            </Button>
            <PermissionGuard permission="leaves.create">
              <Button size="sm" href="/hrms/leaves/create">
                <i className="bx bx-plus"></i>
                {t('create')} {t('leaveRequest')}
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
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <i className="bx bx-calendar text-gray-400 dark:text-gray-500 text-2xl"></i>
            </div>
            <h3 className="font-display tracking-tight text-gray-900 dark:text-gray-100 font-medium">{t('noRecords')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('noLeaveRequests')}</p>
            <PermissionGuard permission="leaves.create">
              <Button href="/hrms/leaves/create" className="mt-4">
                <i className="bx bx-plus"></i>
                {t('create')} {t('leaveRequest')}
              </Button>
            </PermissionGuard>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('employee')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('leaveType')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('startDate')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('endDate')}
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('days')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('status')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {leaves.map((leave, idx) => (
                  <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.trim() || '?'} i={idx} />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1.5">
                        <i className="bx bx-calendar text-gray-400"></i>
                        {leave.leaveType?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(leave.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">
                      {leave.days || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge variant={leaveVariant(leave.status)} label={leave.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {leave.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <PermissionGuard permission="leaves.approve">
                            <button
                              onClick={async () => {
                                if (typeof window !== 'undefined' && window.confirm(t('approveLeave') || 'Approve this leave request?')) {
                                  try {
                                    await api.post(`/hrms/leaves/${leave.id}/approve`);
                                    await loadLeaves();
                                  } catch (err: any) {
                                    alert(err.message || t('errorLoading'));
                                  }
                                }
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                              title={t('approve')}
                            >
                              <i className="bx bx-check-circle text-lg"></i>
                            </button>
                            <button
                              onClick={async () => {
                                const reason = typeof window !== 'undefined' ? window.prompt(t('rejectionReason') || 'Rejection reason:') : null;
                                if (reason !== null && reason !== '') {
                                  try {
                                    await api.post(`/hrms/leaves/${leave.id}/reject`, { reason });
                                    await loadLeaves();
                                  } catch (err: any) {
                                    alert(err.message || t('errorLoading'));
                                  }
                                }
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              title={t('reject')}
                            >
                              <i className="bx bx-x-circle text-lg"></i>
                            </button>
                          </PermissionGuard>
                        </div>
                      )}
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

