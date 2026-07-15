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

  return (
      <div className="space-y-5">
        <PageHeader
          title={t('employees')}
          subtitle="Everyone on your team, active and past"
          count={loading ? undefined : filteredEmployees.length}
          breadcrumbs={[{ label: t('humanResources') }, { label: t('employees') }]}
          actions={
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
              className="h-9 px-4 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 text-[13px] flex-1 min-w-[220px]"
            />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-9 px-4 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent dark:bg-gray-700 dark:text-gray-100 text-[13px]"
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
              className="h-9 px-4 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent dark:bg-gray-700 dark:text-gray-100 text-[13px]"
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
                <Link
                  href="/hrms/employees/create"
                  className="inline-flex items-center h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700"
                >
                  <i className="bx bx-plus mr-2"></i>
                  {t('addEmployee')}
                </Link>
              </PermissionGuard>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('employee')}
                      </th>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('department')}
                      </th>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('position')}
                      </th>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('status')}
                      </th>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('hireDate')}
                      </th>
                      <th className="px-6 py-2.5 text-right text-2xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((employee) => {
                      const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
                      const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
                      const statusColors: Record<string, string> = {
                        active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
                        on_leave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
                        suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
                        terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
                      };

                      return (
                        <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                  <span className="text-brand-600 dark:text-brand-400 font-medium">{initials || 'U'}</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{fullName || employee.name || '—'}</div>
                                <div className="text-[13px] text-gray-500 dark:text-gray-400">{employee.employeeNumber || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="text-[13px] text-gray-900 dark:text-gray-100">{employee.department?.name || '—'}</div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="text-[13px] text-gray-900 dark:text-gray-100">{employee.position?.title || '—'}</div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                statusColors[employee.employmentStatus] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                              }`}
                            >
                              {employee.employmentStatus
                                ? employee.employmentStatus.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                                : t('active')
                              }
                            </span>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                            {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-right text-[13px] font-medium">
                            <div className="flex justify-end items-center space-x-2">
                              <PermissionGuard permission="employees.view">
                                <Link
                                  href={`/hrms/employees/${employee.id}`}
                                  className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                                  title={t('view')}
                                >
                                  <i className="bx bx-show text-lg"></i>
                                </Link>
                              </PermissionGuard>
                              <PermissionGuard permission="employees.edit">
                                <Link
                                  href={`/hrms/employees/${employee.id}/edit`}
                                  className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
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
                                  className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
