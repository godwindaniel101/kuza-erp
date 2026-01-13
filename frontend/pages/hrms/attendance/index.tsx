import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';

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
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('attendance')}</h1>
        <div className="flex space-x-2">
          <PermissionGuard permission="attendance.clock-in">
            <button
              onClick={clockIn}
              disabled={clockingIn || clockingOut}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors dark:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clockingIn ? t('clockingIn') || 'Clocking in...' : t('clockIn')}
            </button>
          </PermissionGuard>
          <PermissionGuard permission="attendance.clock-out">
            <button
              onClick={clockOut}
              disabled={clockingIn || clockingOut}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clockingOut ? t('clockingOut') || 'Clocking out...' : t('clockOut')}
            </button>
          </PermissionGuard>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
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
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('employee')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('clockIn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('clockOut')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('hours')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {record.employee?.firstName} {record.employee?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {record.clockIn ? new Date(record.clockIn).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {record.clockOut ? new Date(record.clockOut).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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

