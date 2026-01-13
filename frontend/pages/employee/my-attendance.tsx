import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';

export default function MyAttendancePage() {
  const { t } = useTranslation('common');
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'entries' | 'timesheets'>('entries');

  useEffect(() => {
    loadAttendanceData();
  }, []);

  const loadAttendanceData = async () => {
    try {
      const [entriesRes, timesheetsRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>(
          '/hrms/attendance/entries'
        ).catch(() => ({ success: false, data: [] as any[] })),
        api.get<{ success: boolean; data: any[] }>(
          '/hrms/attendance/timesheets'
        ).catch(() => ({ success: false, data: [] as any[] })),
      ]);

      if (entriesRes.success) {
        setEntries(entriesRes.data);
      }
      if (timesheetsRes.success) {
        setTimesheets(timesheetsRes.data);
      }
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const clockIn = async () => {
    try {
      await api.post('/hrms/attendance/clock-in');
      await loadAttendanceData();
    } catch (err) {
      console.error('Failed to clock in:', err);
      alert(t('clockInFailed'));
    }
  };

  const clockOut = async () => {
    try {
      await api.post('/hrms/attendance/clock-out');
      await loadAttendanceData();
    } catch (err) {
      console.error('Failed to clock out:', err);
      alert(t('clockOutFailed'));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('myAttendance')}</h1>
        <div className="flex space-x-3">
          <button
            onClick={clockIn}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            <i className="bx bx-log-in mr-2"></i>
            {t('clockIn')}
          </button>
          <button
            onClick={clockOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
          >
            <i className="bx bx-log-out mr-2"></i>
            {t('clockOut')}
          </button>
        </div>
      </div>

      <div className="mb-4 border-b">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('entries')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'entries'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('timeEntries')}
          </button>
          <button
            onClick={() => setActiveTab('timesheets')}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'timesheets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('timesheets')}
          </button>
        </nav>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {activeTab === 'entries' ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('clockIn')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('clockOut')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('hours')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    {t('noTimeEntries')}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.hours || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('period')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('totalHours')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timesheets.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    {t('noTimesheets')}
                  </td>
                </tr>
              ) : (
                timesheets.map((sheet) => (
                  <tr key={sheet.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sheet.period || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sheet.totalHours || 0} {t('hours')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          sheet.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : sheet.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {sheet.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};

