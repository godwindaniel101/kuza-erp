import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

export default function DepartmentsPage() {
  const { t } = useTranslation('common');
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/departments');
      if (response.success) {
        setDepartments(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm(t('confirmDelete') || 'Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/hrms/departments/${id}`);
      setToast({ message: t('departmentDeleted') || 'Department deleted successfully', type: 'success' });
      await loadDepartments();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('deleteFailed') || 'Failed to delete department', type: 'error' });
    }
  };

  return (
      <div className="space-y-6">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="flex justify-end">
          <PermissionGuard permission="departments.create">
            <Link
              href="/hrms/departments/create"
              className="inline-flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="bx bx-plus mr-2"></i>
              {t('addDepartment')}
            </Link>
          </PermissionGuard>
        </div>

        <Card>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12">
              <i className="bx bx-buildings text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{t('noDepartments')}</p>
              <PermissionGuard permission="departments.create">
                <Link
                  href="/hrms/departments/create"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <i className="bx bx-plus mr-2"></i>
                  {t('addDepartment')}
                </Link>
              </PermissionGuard>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('name')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('description')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('parent')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {departments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((dept) => (
                      <tr key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{dept.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{dept.description || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{dept.parent?.name || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              dept.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {dept.isActive ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <PermissionGuard permission="departments.edit">
                              <Link
                                href={`/hrms/departments/${dept.id}/edit`}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              >
                                <i className="bx bx-edit"></i>
                              </Link>
                            </PermissionGuard>
                            <PermissionGuard permission="departments.delete">
                              <button
                                onClick={() => handleDelete(dept.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              >
                                <i className="bx bx-trash"></i>
                              </button>
                            </PermissionGuard>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(departments.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={departments.length}
                startIndex={(currentPage - 1) * itemsPerPage}
                endIndex={Math.min(currentPage * itemsPerPage, departments.length)}
              />
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
