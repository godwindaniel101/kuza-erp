import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

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
      <div className="space-y-5">
        <PageHeader
          title={t('tables') || 'Tables'}
          count={loading ? undefined : tables.length}
          subtitle="Your floor plan, seat by seat"
          breadcrumbs={[{ label: 'Restaurant' }, { label: t('tables') || 'Tables' }]}
          actions={
            <PermissionGuard permission="tables.create">
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/rms/tables/create')}
              >
                <i className="bx bx-plus" aria-hidden="true"></i>
                {t('create')} {t('table')}
              </Button>
            </PermissionGuard>
          }
        />
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : tables.length === 0 ? (
          <EmptyState
            icon="bx-grid-alt"
            title={t('noTablesYet') || 'No tables yet'}
            description={t('createTablesToSeat') || 'Create tables to start seating guests'}
            actions={
              <PermissionGuard permission="tables.create">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/rms/tables/create')}
                >
                  <i className="bx bx-plus" aria-hidden="true"></i>
                  {t('create')} {t('table')}
                </Button>
              </PermissionGuard>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 hover:ring-brand-300 dark:hover:ring-brand-700 transition-shadow duration-150"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{table.name}</h3>
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

