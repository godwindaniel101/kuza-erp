import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';

export default function TablesPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/rms/tables');
      if (response.success) {
        setTables(response.data);
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard permission="tables.view">
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('tables')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('manageTables') || 'Manage your restaurant tables and seating'}
            </p>
          </div>
          <PermissionGuard permission="tables.create">
            <button
              onClick={() => router.push('/rms/tables/create')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 dark:bg-red-700 dark:hover:bg-red-600"
            >
              <i className="bx bx-plus"></i>
              {t('create')} {t('table')}
            </button>
          </PermissionGuard>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : tables.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <i className="bx bx-grid-alt text-red-600 dark:text-red-400 text-3xl"></i>
            </div>
            <h3 className="text-gray-900 dark:text-gray-100 font-medium text-lg mb-2">{t('noTablesYet') || 'No tables yet'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('createTablesToSeat') || 'Create tables to start seating guests'}</p>
            <PermissionGuard permission="tables.create">
              <button
                onClick={() => router.push('/rms/tables/create')}
                className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors dark:bg-red-700 dark:hover:bg-red-600"
              >
                <i className="bx bx-plus mr-2"></i>
                {t('create')} {t('table')}
              </button>
            </PermissionGuard>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{table.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      table.status === 'available'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : table.status === 'occupied'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                        : table.status === 'reserved'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {table.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('capacity')}: {table.capacity} {t('people')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};

