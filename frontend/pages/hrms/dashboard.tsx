import { useState, useEffect, useRef } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge, { StatusBadgeVariant } from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Card from '@/components/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { WeeklyBarChart } from '@/components/ui/charts';

const AVATAR_TONES = [
  'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
];

function Avatar({ name, i }: { name: string; i: number }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
      {initials}
    </span>
  );
}

const leaveVariant = (status?: string): StatusBadgeVariant => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'error';
  return 'warning';
};

const DEPT_BAR_TONES = ['bg-brand-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-violet-500'];

export default function HRMSDashboard() {
  const { t } = useTranslation('common');
  const [greeting, setGreeting] = useState('Welcome back');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    departmentsCount: 0,
    pendingLeaves: 0,
    onLeaveToday: 0,
    clockedIn: 0,
    todayAttendance: 0,
    presentToday: 0,
    absentToday: 0,
  });
  const [deptDist, setDeptDist] = useState<{ name: string; count: number }[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<{ label: string; value: number }[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
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
      const [employeesRes, leavesRes, attendanceRes, departmentsRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/hrms/employees').catch(() => ({ success: false, data: [] })),
        api.get<{ success: boolean; data: any[] }>('/hrms/leaves').catch(() => ({ success: false, data: [] })),
        api.get<{ success: boolean; data: any[] }>('/hrms/attendance').catch(() => ({ success: false, data: [] })),
        api.get<{ success: boolean; data: any[] }>('/hrms/departments').catch(() => ({ success: false, data: [] })),
      ]);

      let employees: any[] = [];
      if (employeesRes.success && employeesRes.data) {
        employees = employeesRes.data;
        setRecentEmployees(employees.slice(0, 5));
        // Department distribution
        const byDept: Record<string, number> = {};
        employees.forEach((e: any) => {
          const d = e.department?.name || e.departmentName || (typeof e.department === 'string' ? e.department : 'Unassigned');
          byDept[d] = (byDept[d] || 0) + 1;
        });
        setDeptDist(
          Object.entries(byDept)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6),
        );
      }

      const today = new Date().toISOString().split('T')[0];
      let onLeaveToday = 0;
      let pendingLeaves = 0;
      if (leavesRes.success && leavesRes.data) {
        const leaves = leavesRes.data;
        pendingLeaves = leaves.filter((l: any) => (l.status || '').toLowerCase() === 'pending').length;
        onLeaveToday = leaves.filter((l: any) => {
          const s = l.startDate ? new Date(l.startDate).toISOString().split('T')[0] : null;
          const e = l.endDate ? new Date(l.endDate).toISOString().split('T')[0] : null;
          return (l.status || '').toLowerCase() === 'approved' && s && e && s <= today && e >= today;
        }).length;
        setRecentLeaves(leaves.slice(0, 5));
      }

      let clockedIn = 0;
      let presentToday = 0;
      let todayAttendance = 0;
      if (attendanceRes.success && attendanceRes.data) {
        const todayEntries = attendanceRes.data.filter((a: any) => a.date && String(a.date).startsWith(today));
        todayAttendance = todayEntries.length;
        clockedIn = todayEntries.filter((a: any) => a.clockIn && !a.clockOut).length;
        presentToday = todayEntries.filter((a: any) => a.clockIn).length;

        // Present headcount per day over the last 7 days (entries with a clock-in)
        const byDay = new Map<string, number>();
        const trend: { label: string; value: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          byDay.set(key, 0);
          trend.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), value: 0 });
        }
        attendanceRes.data.forEach((a: any) => {
          const key = a.date ? String(a.date).split('T')[0] : null;
          if (key && byDay.has(key) && a.clockIn) byDay.set(key, (byDay.get(key) || 0) + 1);
        });
        let idx = 0;
        byDay.forEach((v) => {
          trend[idx].value = v;
          idx += 1;
        });
        setAttendanceTrend(trend);
      }

      const activeEmployees = employees.filter((e: any) => e.isActive !== false).length;
      setStats({
        totalEmployees: employees.length,
        activeEmployees,
        departmentsCount: departmentsRes.success ? departmentsRes.data.length : 0,
        pendingLeaves,
        onLeaveToday,
        clockedIn,
        todayAttendance,
        presentToday,
        absentToday: Math.max(0, activeEmployees - presentToday - onLeaveToday),
      });
    } catch (err) {
      console.error('Failed to load HRMS dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const attendanceRate = stats.activeEmployees > 0 ? Math.round((stats.presentToday / stats.activeEmployees) * 100) : 0;
  const maxDept = Math.max(1, ...deptDist.map((d) => d.count));

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${greeting} 👋`}
        subtitle={
          stats.pendingLeaves > 0
            ? `You have ${stats.pendingLeaves} pending leave request${stats.pendingLeaves === 1 ? '' : 's'} to review`
            : 'Your workforce at a glance'
        }
        breadcrumbs={[{ label: 'People', href: '/hrms/dashboard' }, { label: 'Dashboard' }]}
        actions={
          <div className="flex gap-2">
            <Button href="/hrms/departments/create" variant="secondary" size="md">
              <i className="bx bx-buildings" /> Department
            </Button>
            <Button href="/hrms/employees/create" size="md">
              <i className="bx bx-plus" /> Add Employee
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <CardSkeleton key={k} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Workforce" value={stats.totalEmployees} icon="bx-group" tone="info" caption={`${stats.activeEmployees} active`} />
          <StatCard label="Present Today" value={stats.presentToday} icon="bx-check-circle" tone="success" caption={`${attendanceRate}% attendance`} />
          <StatCard label="On Leave Today" value={stats.onLeaveToday} icon="bx-calendar-x" tone="warning" />
          <StatCard label="Departments" value={stats.departmentsCount} icon="bx-buildings" tone="default" caption={`${stats.pendingLeaves} leaves pending`} />
        </div>
      )}

      {/* Attendance trend — present headcount over the last 7 days */}
      <Card title="Attendance this week" subtitle="Present headcount per day">
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ) : (
          <div className="pt-1">
            <WeeklyBarChart
              data={attendanceTrend}
              height={190}
              formatValue={(v) => `${Math.round(v)}`}
              emptyMessage="No attendance recorded yet"
            />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Department distribution */}
        <Card title="Employees by department" className="lg:col-span-2">
          {deptDist.length === 0 ? (
            <p className="py-6 text-sm text-gray-400">No department data yet.</p>
          ) : (
            <div className="space-y-3 pt-1">
              {deptDist.map((d, i) => (
                <div key={d.name}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{d.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className={`h-full rounded-full ${DEPT_BAR_TONES[i % DEPT_BAR_TONES.length]}`} style={{ width: `${(d.count / maxDept) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Attendance summary */}
        <Card title="Today's attendance">
          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { label: 'Present', value: stats.presentToday, tone: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
              { label: 'On leave', value: stats.onLeaveToday, tone: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
              { label: 'Clocked in', value: stats.clockedIn, tone: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-500/10' },
              { label: 'Absent', value: stats.absentToday, tone: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' },
            ].map((b) => (
              <div key={b.label} className={`rounded-xl p-3 ${b.bg}`}>
                <p className={`text-2xl font-bold ${b.tone}`}>{b.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{b.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent employees */}
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent employees</h3>
            <Button href="/hrms/employees" variant="ghost" size="sm">View all</Button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentEmployees.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No employees yet.</p>
            ) : (
              recentEmployees.map((e, i) => {
                const name = `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name || e.email || 'Employee';
                return (
                  <div key={e.id || i} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={name} i={i} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
                      <p className="truncate text-xs text-gray-500">{e.position?.title || e.jobTitle || e.department?.name || '—'}</p>
                    </div>
                    {e.isActive !== false && <StatusBadge variant="success" label="Active" />}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Recent leave requests */}
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Leave requests</h3>
            <Button href="/hrms/leaves" variant="ghost" size="sm">View all</Button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentLeaves.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No leave requests.</p>
            ) : (
              recentLeaves.map((l, i) => {
                const name = l.employee ? `${l.employee.firstName || ''} ${l.employee.lastName || ''}`.trim() : l.employeeName || 'Employee';
                return (
                  <div key={l.id || i} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={name} i={i} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
                      <p className="truncate text-xs text-gray-500">{l.leaveType?.name || l.type || 'Leave'}</p>
                    </div>
                    <StatusBadge variant={leaveVariant(l.status)} label={l.status || 'pending'} />
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
