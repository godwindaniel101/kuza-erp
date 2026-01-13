import { useState, useEffect, useRef } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function HRMSDashboard() {
  const { t } = useTranslation('common');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    departmentsCount: 0,
    pendingLeaves: 0,
    onLeaveToday: 0,
    clockedIn: 0,
    todayAttendance: 0,
  });
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Only load data once, prevent multiple simultaneous loads
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      hasLoadedRef.current = true;
      isLoadingRef.current = true;
      loadDashboardData().finally(() => {
        isLoadingRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load HRMS stats in parallel
      const [employeesRes, leavesRes, attendanceRes, departmentsRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/hrms/employees').catch(() => ({ success: false, data: [] })),
        api.get<{ success: boolean; data: any[] }>('/hrms/leaves').catch(() => ({ success: false, data: [] })),
        api.get<{ success: boolean; data: any[] }>('/hrms/attendance').catch(() => ({ success: false, data: [] })),
        api.get<{ success: boolean; data: any[] }>('/hrms/departments').catch(() => ({ success: false, data: [] })),
      ]);

      if (employeesRes.success && employeesRes.data) {
        const employees = employeesRes.data;
        setStats(prev => ({
          ...prev,
          totalEmployees: employees.length,
          activeEmployees: employees.filter((e: any) => e.isActive !== false).length,
        }));
        setRecentEmployees(employees.slice(0, 5));
      }

      if (departmentsRes.success && departmentsRes.data) {
        setStats(prev => ({
          ...prev,
          departmentsCount: departmentsRes.data.length,
        }));
      }

      if (leavesRes.success && leavesRes.data) {
        const leaves = leavesRes.data;
        const today = new Date().toISOString().split('T')[0];
        const pendingLeaves = leaves.filter((l: any) => l.status === 'pending');
        const onLeaveToday = leaves.filter((l: any) => {
          const startDate = l.startDate ? new Date(l.startDate).toISOString().split('T')[0] : null;
          const endDate = l.endDate ? new Date(l.endDate).toISOString().split('T')[0] : null;
          return l.status === 'approved' && startDate && endDate && startDate <= today && endDate >= today;
        });
        
        setStats(prev => ({
          ...prev,
          pendingLeaves: pendingLeaves.length,
          onLeaveToday: onLeaveToday.length,
        }));
        setRecentLeaves(leaves.slice(0, 5));
      }

      if (attendanceRes.success && attendanceRes.data) {
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = attendanceRes.data.filter((a: any) => 
          a.date && a.date.startsWith(today)
        );
        const clockedIn = todayEntries.filter((a: any) => a.clockIn && !a.clockOut).length;
        
        setStats(prev => ({
          ...prev,
          todayAttendance: todayEntries.length,
          clockedIn,
        }));
      }
    } catch (err) {
      console.error('Failed to load HRMS dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Quick Actions Banner - Matching Laravel Pattern */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm p-6 text-white">
          {/* Faint background image overlay */}
          <div className="absolute inset-0 bg-[url('/images/hrms-daashboard.png')] bg-right bg-no-repeat bg-full opacity-10 pointer-events-none" aria-hidden="true"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">{t('welcomeToHRMS') || 'Welcome to HRMS'}</h3>
              <p className="text-blue-100">{t('hrmsTagline') || 'Manage your human resources efficiently'}</p>
            </div>
            <div className="relative z-10 flex space-x-3">
              <Link
                href="/hrms/employees/create"
                className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center space-x-2"
              >
                <i className="bx bx-plus"></i>
                <span>{t('addEmployee') || 'Add Employee'}</span>
              </Link>
              <Link
                href="/hrms/departments/create"
                className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center space-x-2"
              >
                <i className="bx bx-buildings"></i>
                <span>{t('addDepartment') || 'Add Department'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards - First Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('totalEmployees') || 'Total Employees'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.totalEmployees}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <i className="bx bx-group text-blue-600 dark:text-blue-400 text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('activeEmployees') || 'Active Employees'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.activeEmployees}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <i className="bx bx-check-circle text-green-600 dark:text-green-400 text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('departments') || 'Departments'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.departmentsCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <i className="bx bx-buildings text-indigo-600 dark:text-indigo-400 text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('pendingLeaves') || 'Pending Leaves'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.pendingLeaves}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <i className="bx bx-calendar-check text-yellow-600 dark:text-yellow-400 text-2xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards - Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('onLeaveToday') || 'On Leave Today'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.onLeaveToday}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <i className="bx bx-calendar-x text-orange-600 dark:text-orange-400 text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('clockedIn') || 'Clocked In'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.clockedIn}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <i className="bx bx-time-five text-emerald-600 dark:text-emerald-400 text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('todayAttendance') || 'Today Attendance'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stats.todayAttendance}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <i className="bx bx-time text-purple-600 dark:text-purple-400 text-2xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Employees */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('recentEmployees') || 'Recent Employees'}</h3>
                <Link
                  href="/hrms/employees"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  {t('viewAll')}
                </Link>
              </div>
            </div>
            <div className="p-6">
              {recentEmployees.length > 0 ? (
                <div className="space-y-3">
                  {recentEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {employee.firstName?.charAt(0) || employee.name?.charAt(0) || 'E'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {employee.firstName && employee.lastName 
                            ? `${employee.firstName} ${employee.lastName}`
                            : employee.name || 'Employee'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {employee.email || employee.employeeNumber || '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="bx bx-user text-4xl text-gray-300 dark:text-gray-600 mb-2"></i>
                  <p className="text-gray-500 dark:text-gray-400">{t('noEmployees') || 'No employees yet'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Leave Requests */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('recentLeaveRequests') || 'Recent Leave Requests'}</h3>
                <Link
                  href="/hrms/leaves"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  {t('viewAll')}
                </Link>
              </div>
            </div>
            <div className="p-6">
              {recentLeaves.length > 0 ? (
                <div className="space-y-3">
                  {recentLeaves.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {leave.employee?.name || leave.employee?.firstName || 'Employee'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {leave.leaveType?.name || 'Leave'} • {leave.startDate ? new Date(leave.startDate).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          leave.status === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            : leave.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                        }`}
                      >
                        {leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="bx bx-calendar text-4xl text-gray-300 dark:text-gray-600 mb-2"></i>
                  <p className="text-gray-500 dark:text-gray-400">{t('noLeaveRequests') || 'No leave requests yet'}</p>
                </div>
              )}
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
