import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

export default function AttendancePage() {
  const { t } = useTranslation('common');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/attendance');
      if (response.success) {
        setRecords(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const clockIn = async () => {
    setClockingIn(true);
    try {
      const response = await api.post('/hrms/attendance/clock-in', { entryType: 'web' });
      if (response.success) {
        setToast({ message: t('clockedInSuccessfully') || 'Clocked in successfully', type: 'success' });
        await loadRecords();
      }
    } catch (err: any) {
      console.error('Failed to clock in:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error ||
                          err.message ||
                          t('clockInFailed') || 
                          'Failed to clock in';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setClockingIn(false);
    }
  };

  const clockOut = async () => {
    setClockingOut(true);
    try {
      const response = await api.post('/hrms/attendance/clock-out', {});
      if (response.success) {
        setToast({ message: t('clockedOutSuccessfully') || 'Clocked out successfully', type: 'success' });
        await loadRecords();
      }
    } catch (err: any) {
      console.error('Failed to clock out:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error ||
                          err.message ||
                          t('clockOutFailed') || 
                          'Failed to clock out';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setClockingOut(false);
    }
  };

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader
        title={t('attendance')}
        subtitle="Who clocked in, and when"
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('attendance') }]}
        actions={
          <>
            <PermissionGuard permission="attendance.clock-in">
              <button
                onClick={clockIn}
                disabled={clockingIn || clockingOut}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-[13px] font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {clockingIn ? t('clockingIn') || 'Clocking in...' : t('clockIn')}
              </button>
            </PermissionGuard>
            <PermissionGuard permission="attendance.clock-out">
              <Button
                variant="primary"
                size="sm"
                onClick={clockOut}
                disabled={clockingIn || clockingOut}
              >
                {clockingOut ? t('clockingOut') || 'Clocking out...' : t('clockOut')}
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <Card>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <i className="bx bx-time text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noRecords')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('noTimeEntries')}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('employee')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('clockIn')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('clockOut')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('hours')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {record.employee?.firstName} {record.employee?.lastName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {record.clockIn ? new Date(record.clockIn).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {record.clockOut ? new Date(record.clockOut).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {record.totalHours || '—'}
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

