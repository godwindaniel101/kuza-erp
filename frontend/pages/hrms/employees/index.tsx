import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge, { StatusBadgeVariant } from '@/components/ui/StatusBadge';
import { downloadCsv, formatDate } from '@/lib/format';

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

const employmentVariant = (status?: string): StatusBadgeVariant => {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'success';
    case 'on_leave':
      return 'warning';
    case 'suspended':
      return 'error';
    case 'terminated':
      return 'info';
    default:
      return 'success';
  }
};

export default function EmployeesPage() {
  const { t } = useTranslation('common');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesRes, departmentsRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/hrms/employees'),
        api.get<{ success: boolean; data: any[] }>('/hrms/departments'),
      ]);
      if (employeesRes.success) {
        setEmployees(employeesRes.data);
      }
      if (departmentsRes.success) {
        setDepartments(departmentsRes.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = !search ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment = !departmentFilter || emp.departmentId === departmentFilter;
    const matchesStatus = !statusFilter || emp.employmentStatus === statusFilter;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, departmentFilter, statusFilter]);

  const handleExport = () => {
    downloadCsv(
      'employees.csv',
      ['Employee', 'Employee Number', 'Email', 'Department', 'Position', 'Status', 'Hire Date'],
      filteredEmployees.map((e) => [
        `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name || '',
        e.employeeNumber || '',
        e.email || '',
        e.department?.name || '',
        e.position?.title || '',
        e.employmentStatus || '',
        e.hireDate ? formatDate(e.hireDate) : '',
      ]),
    );
  };

  return (
      <div className="space-y-5">
        <PageHeader
          title={t('employees')}
          subtitle="Everyone on your team, active and past"
          count={loading ? undefined : filteredEmployees.length}
          breadcrumbs={[{ label: t('humanResources') }, { label: t('employees') }]}
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={handleExport} disabled={loading || filteredEmployees.length === 0}>
                <i className="bx bx-download"></i>
                {t('export') === 'export' ? 'Export' : t('export')}
              </Button>
              <PermissionGuard permission="employees.create">
                <Button size="sm" variant="secondary" href="/hrms/employees/invite-from-rms">
                  <i className="bx bx-user-plus"></i>
                  {t('addUsersFromRMS')}
                </Button>
                <Button size="sm" href="/hrms/employees/create">
                  <i className="bx bx-plus"></i>
                  {t('addEmployee')}
                </Button>
              </PermissionGuard>
            </>
          }
        />

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-3">
          <form className="flex flex-wrap gap-3" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${t('search')} ${t('employees').toLowerCase()}...`}
              className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 text-sm flex-1 min-w-[220px]"
            />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
            >
              <option value="">{t('all')} {t('departments')}</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
            >
              <option value="">{t('all')} {t('status')}</option>
              <option value="active">{t('active')}</option>
              <option value="on_leave">{t('onLeave')}</option>
              <option value="suspended">{t('suspended')}</option>
              <option value="terminated">{t('terminated')}</option>
            </select>
          </form>
        </div>

        {/* Employees Table */}
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <i className="bx bx-user text-xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {t('noEmployeesFound') === 'noEmployeesFound' ? 'No employees found' : t('noEmployeesFound')}
              </h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">Add your first employee to get started</p>
              <PermissionGuard permission="employees.create">
                <Button href="/hrms/employees/create">
                  <i className="bx bx-plus"></i>
                  {t('addEmployee')}
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('employee')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('department')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('position')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('status')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('hireDate')}
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((employee, idx) => {
                      const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();

                      return (
                        <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar name={fullName || employee.name || '?'} i={idx} />
                              <div className="min-w-0">
                                <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{fullName || employee.name || '—'}</div>
                                <div className="text-[13px] text-gray-500 dark:text-gray-400">{employee.employeeNumber || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-[13px] text-gray-900 dark:text-gray-100">{employee.department?.name || '—'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-[13px] text-gray-900 dark:text-gray-100">{employee.position?.title || '—'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge
                              variant={employmentVariant(employee.employmentStatus)}
                              label={
                                employee.employmentStatus
                                  ? employee.employmentStatus.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                                  : t('active')
                              }
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end items-center space-x-2">
                              <PermissionGuard permission="employees.view">
                                <Link
                                  href={`/hrms/employees/${employee.id}`}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                                  title={t('view')}
                                >
                                  <i className="bx bx-show text-lg"></i>
                                </Link>
                              </PermissionGuard>
                              <PermissionGuard permission="employees.edit">
                                <Link
                                  href={`/hrms/employees/${employee.id}/edit`}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                                  title={t('edit')}
                                >
                                  <i className="bx bx-edit text-lg"></i>
                                </Link>
                              </PermissionGuard>
                              <PermissionGuard permission="employees.delete">
                                <button
                                  onClick={() => {
                                    if (confirm(t('confirmDelete'))) {
                                      api.delete(`/hrms/employees/${employee.id}`).then(() => loadData());
                                    }
                                  }}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                  title={t('delete')}
                                >
                                  <i className="bx bx-trash text-lg"></i>
                                </button>
                              </PermissionGuard>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredEmployees.length > itemsPerPage && (
                <div className="px-6 pb-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredEmployees.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredEmployees.length}
                    startIndex={(currentPage - 1) * itemsPerPage}
                    endIndex={Math.min(currentPage * itemsPerPage, filteredEmployees.length)}
                  />
                </div>
              )}
            </>
          )}
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
