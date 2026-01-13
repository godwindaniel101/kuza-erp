import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

export default function PositionsPage() {
  const { t } = useTranslation('common');
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/positions');
      if (response.success) {
        setPositions(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/hrms/positions/${id}`);
      await loadPositions();
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        alert(err.message || t('deleteFailed'));
      }
    }
  };

  return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <PermissionGuard permission="positions.create">
            <Link
              href="/hrms/positions/create"
              className="inline-flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="bx bx-plus mr-2"></i>
              {t('addPosition')}
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
          ) : positions.length === 0 ? (
            <div className="text-center py-12">
              <i className="bx bx-briefcase text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{t('noPositions')}</p>
              <PermissionGuard permission="positions.create">
                <Link
                  href="/hrms/positions/create"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <i className="bx bx-plus mr-2"></i>
                  {t('addPosition')}
                </Link>
              </PermissionGuard>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('title')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('department')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {positions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{position.title}</div>
                          {position.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{position.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{position.department?.name || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              position.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {position.isActive ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <PermissionGuard permission="positions.edit">
                              <Link
                                href={`/hrms/positions/${position.id}/edit`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              >
                                <i className="bx bx-edit"></i>
                              </Link>
                            </PermissionGuard>
                            <PermissionGuard permission="positions.delete">
                              <button
                                onClick={() => handleDelete(position.id)}
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
                totalPages={Math.ceil(positions.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={positions.length}
                startIndex={(currentPage - 1) * itemsPerPage}
                endIndex={Math.min(currentPage * itemsPerPage, positions.length)}
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
