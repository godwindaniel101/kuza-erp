import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function EmployeeDashboard() {
  const { t } = useTranslation('common');
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load employee stats
      const [leavesRes, attendanceRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/hrms/leaves').catch(() => ({ success: false, data: [] as any[] })),
        api.get<{ success: boolean; data: any[] }>('/hrms/attendance/timesheets').catch(() => ({ success: false, data: [] as any[] })),
      ]);

      const leaveRequests = leavesRes.success ? leavesRes.data : [];
      const timesheets = attendanceRes.success ? attendanceRes.data : [];

      setStats({
        pendingLeaves: leaveRequests.filter((l: any) => l.status === 'pending').length,
        approvedLeaves: leaveRequests.filter((l: any) => l.status === 'approved').length,
        totalHours: timesheets.reduce((sum: number, t: any) => sum + (t.totalHours || 0), 0),
        recentLeaves: leaveRequests.slice(0, 5),
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('employeeDashboard')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">{t('pendingLeaves')}</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingLeaves || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">{t('approvedLeaves')}</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.approvedLeaves || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">{t('totalHoursThisMonth')}</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalHours || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{t('recentLeaveRequests')}</h2>
            <Link href="/employee/my-leaves" className="text-blue-600 hover:text-blue-800 text-sm">
              {t('viewAll')}
            </Link>
          </div>
          {stats.recentLeaves?.length > 0 ? (
            <ul className="space-y-3">
              {stats.recentLeaves.map((leave: any) => (
                <li key={leave.id} className="border-b pb-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{leave.leaveType?.name || t('leaveRequest')}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(leave.startDate).toLocaleDateString()} -{' '}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        leave.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : leave.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {leave.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">{t('noLeaveRequests')}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('quickActions')}</h2>
          <div className="space-y-3">
            <Link
              href="/employee/my-leaves"
              className="block px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium"
            >
              {t('requestLeave')}
            </Link>
            <Link
              href="/employee/my-attendance"
              className="block px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 font-medium"
            >
              {t('viewAttendance')}
            </Link>
            <Link
              href="/employee/profile"
              className="block px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-medium"
            >
              {t('updateProfile')}
            </Link>
          </div>
        </div>
      </div>
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

