import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

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
      <div className="space-y-6">
        {/* Filters and Actions */}
        <Card padding={false}>
          <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <form className="flex flex-wrap gap-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`${t('search')} ${t('employees').toLowerCase()}...`}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">{t('all')} {t('departments')}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">{t('all')} {t('status')}</option>
                    <option value="active">{t('active')}</option>
                    <option value="on_leave">{t('onLeave')}</option>
                    <option value="suspended">{t('suspended')}</option>
                    <option value="terminated">{t('terminated')}</option>
                  </select>
                </div>
              </form>
              <div className="flex gap-2">
                <PermissionGuard permission="employees.create">
                  <Link
                    href="/hrms/employees/invite-from-rms"
                    className="inline-flex items-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <i className="bx bx-user-plus mr-2"></i>
                    {t('addUsersFromRMS')}
                  </Link>
                  <Link
                    href="/hrms/employees/create"
                    className="inline-flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <i className="bx bx-plus mr-2"></i>
                    {t('addEmployee')}
                  </Link>
                </PermissionGuard>
              </div>
            </div>
          </div>
        </Card>

        {/* Employees Table */}
        <Card padding={false}>
          {loading ? (
            <div className="p-6 text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center py-8 text-red-600">{error}</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-6 text-center py-12">
              <i className="bx bx-user text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{t('noEmployeesFound')}</p>
              <PermissionGuard permission="employees.create">
                <Link
                  href="/hrms/employees/create"
                  className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('employee')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('department')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('position')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('hireDate')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
                        <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">{initials || 'U'}</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{fullName || employee.name || '—'}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{employee.employeeNumber || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">{employee.department?.name || '—'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">{employee.position?.title || '—'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end items-center space-x-2">
                              <PermissionGuard permission="employees.view">
                                <Link
                                  href={`/hrms/employees/${employee.id}`}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                  title={t('view')}
                                >
                                  <i className="bx bx-show text-lg"></i>
                                </Link>
                              </PermissionGuard>
                              <PermissionGuard permission="employees.edit">
                                <Link
                                  href={`/hrms/employees/${employee.id}/edit`}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
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
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredEmployees.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredEmployees.length}
                  startIndex={(currentPage - 1) * itemsPerPage}
                  endIndex={Math.min(currentPage * itemsPerPage, filteredEmployees.length)}
                />
              )}
            </>
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
